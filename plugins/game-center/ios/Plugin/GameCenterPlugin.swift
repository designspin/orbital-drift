import Foundation
import Capacitor
import GameKit

@objc(GameCenterPlugin)
public class GameCenterPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GameCenterPlugin"
    public let jsName = "GameCenter"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "submitScore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showLeaderboard", returnType: CAPPluginReturnPromise)
    ]

    public override func load() {
        print("[GameCenterPlugin] loaded")
    }
    @objc func authenticate(_ call: CAPPluginCall) {
        let player = GKLocalPlayer.local
        player.authenticateHandler = { viewController, error in
            if let viewController = viewController {
                DispatchQueue.main.async {
                    self.bridge?.viewController?.present(viewController, animated: true)
                }
                return
            }

            if let error = error {
                DispatchQueue.main.async {
                    call.reject(error.localizedDescription)
                }
                return
            }

            if player.isAuthenticated {
                DispatchQueue.main.async {
                    call.resolve([
                        "playerId": player.gamePlayerID,
                        "displayName": player.displayName
                    ])
                }
            } else {
                DispatchQueue.main.async {
                    call.reject("Player not authenticated")
                }
            }
        }
    }

    @objc func submitScore(_ call: CAPPluginCall) {
        guard let leaderboardId = call.getString("leaderboardId") else {
            call.reject("leaderboardId is required")
            return
        }
        guard let scoreValue = call.getInt("score") else {
            call.reject("score is required")
            return
        }

        if #available(iOS 14.0, *) {
            GKLeaderboard.submitScore(Int(scoreValue), context: 0, player: GKLocalPlayer.local, leaderboardIDs: [leaderboardId]) { error in
                DispatchQueue.main.async {
                    if let error = error {
                        call.reject(error.localizedDescription)
                    } else {
                        call.resolve()
                    }
                }
            }
        } else {
            let score = GKScore(leaderboardIdentifier: leaderboardId)
            score.value = Int64(scoreValue)
            GKScore.report([score]) { error in
                DispatchQueue.main.async {
                    if let error = error {
                        call.reject(error.localizedDescription)
                    } else {
                        call.resolve()
                    }
                }
            }
        }
    }

    @objc func showLeaderboard(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let viewController: GKGameCenterViewController
            if #available(iOS 14.0, *) {
                if let leaderboardId = call.getString("leaderboardId") {
                    viewController = GKGameCenterViewController(leaderboardID: leaderboardId, playerScope: .global, timeScope: .allTime)
                } else {
                    viewController = GKGameCenterViewController(state: .leaderboards)
                }
            } else {
                viewController = GKGameCenterViewController()
                if let leaderboardId = call.getString("leaderboardId") {
                    viewController.leaderboardIdentifier = leaderboardId
                    viewController.viewState = .leaderboards
                }
            }

            viewController.gameCenterDelegate = self
            self.bridge?.viewController?.present(viewController, animated: true)
            call.resolve()
        }
    }
}

extension GameCenterPlugin: GKGameCenterControllerDelegate {
    public func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
        gameCenterViewController.dismiss(animated: true)
    }
}
