import './style.css'
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
