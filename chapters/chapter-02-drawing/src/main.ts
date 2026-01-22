import './style.css'
import spaceship from '/spaceship.png';

import { CANVAS_WIDTH, CANVAS_HEIGHT, CANVAS_MSG } from './constants';

const app = document.getElementById('app')!;
const canvas = document.createElement('canvas');

canvas.style.aspectRatio = `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
canvas.id = 'game';

app.appendChild(canvas);

canvas.focus();
canvas.style.backgroundColor = 'black';

const ctx = canvas.getContext('2d')!;
ctx.fillStyle = '#ffffff';
ctx.font = '24px sans-serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText(CANVAS_MSG, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

// Rectangles
ctx.fillStyle = 'red';
ctx.fillRect(50, 50, 100, 100);

ctx.strokeStyle = 'blue';
ctx.lineWidth = 5;
ctx.strokeRect(200, 50, 100, 100);

// Circles
ctx.fillStyle = 'green';
ctx.beginPath();
ctx.arc(100, 300, 50, 0, Math.PI * 2);
ctx.fill();

ctx.strokeStyle = 'orange';
ctx.lineWidth = 3;
ctx.beginPath();
ctx.arc(250, 300, 50, 0, Math.PI * 2);
ctx.stroke();

// Lines
ctx.strokeStyle = 'purple';
ctx.lineWidth = 4;
ctx.beginPath();
ctx.moveTo(400, 50);
ctx.lineTo(550, 150);
ctx.lineTo(400, 250);
ctx.closePath();
ctx.stroke();

// Linecap and Linejoin
ctx.strokeStyle = 'brown';
ctx.lineWidth = 10;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';
ctx.beginPath();
ctx.moveTo(600, 50);
ctx.lineTo(700, 150);
ctx.lineTo(600, 250);
ctx.stroke();

// Gradients and Patterns
const gradient = ctx.createLinearGradient(50, 400, 150, 500);
gradient.addColorStop(0, 'yellow');
gradient.addColorStop(1, 'red');

ctx.fillStyle = gradient;
ctx.fillRect(50, 400, 100, 100);

// Text Styles
ctx.fillStyle = 'cyan';
ctx.font = 'bold 30px serif';
ctx.textAlign = 'left';
ctx.textBaseline = 'alphabetic';
ctx.fillText('Styled Text', 200, 450);

ctx.strokeStyle = 'blue';
ctx.lineWidth = 2;
ctx.font = 'italic 30px serif';
ctx.strokeText('Outlined Text', 200, 500);


// Save and Restore
ctx.fillStyle = 'black';
ctx.fillRect(400, 400, 100, 100);

ctx.save();
ctx.fillStyle = 'white';
ctx.fillRect(425, 425, 50, 50);
ctx.restore();

ctx.fillRect(450, 450, 50, 50); 

// Transformations
ctx.fillStyle = 'magenta';
ctx.save();
ctx.translate(600, 450);
ctx.rotate(Math.PI / 4);
ctx.fillRect(-25, -25, 50, 50);
ctx.restore();

// Images
const image = new Image();
image.src = spaceship;
image.onload = () => {
    ctx.drawImage(image, 680, 50, 100, 100);
    
    // rotated image (uniform scale, keep aspect ratio)
    const scale = 0.1; // tweak as needed
    ctx.save();
    ctx.translate(700, 300);
    ctx.rotate(Math.PI / 6);
    ctx.scale(scale, scale);
    ctx.drawImage(image, -image.width / 2, -image.height / 5);
    ctx.restore();
};