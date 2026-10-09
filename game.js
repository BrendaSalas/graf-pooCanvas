// ======================================
// CONFIGURACIÓN DEL CANVAS
// ======================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ======================================
// CLASE PELOTA
// ======================================

class Ball {
    constructor(x, y, radius, speedX, speedY, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.speedX = speedX;
        this.speedY = speedY;
        this.color = color;
    }

    draw() {
        ctx.save();

        // Brillo de la pelota
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 12;

        ctx.beginPath();
        ctx.arc(
            this.x,
            this.y,
            this.radius,
            0,
            Math.PI * 2
        );

        ctx.fillStyle = this.color;
        ctx.fill();

        ctx.closePath();
        ctx.restore();
    }

    move() {
        this.x += this.speedX;
        this.y += this.speedY;

        // Rebote en la parte superior e inferior
        if (this.y - this.radius <= 0) {
            this.y = this.radius;
            this.speedY = Math.abs(this.speedY);
        }

        if (this.y + this.radius >= canvas.height) {
            this.y = canvas.height - this.radius;
            this.speedY = -Math.abs(this.speedY);
        }
    }

    reset(direction) {
        this.x = canvas.width / 2;
        this.y = Math.random() *
            (canvas.height - 100) + 50;

        this.speedX = Math.abs(this.speedX) * direction;

        this.speedY =
            (Math.random() < 0.5 ? -1 : 1) *
            Math.max(2.5, Math.abs(this.speedY));
    }
}

// ======================================
// CLASE PALETA
// ======================================

class Paddle {
    constructor(x, y, width, height, color) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
        this.speed = 6;
    }

    draw() {
        ctx.save();

        ctx.shadowColor = this.color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = this.color;

        ctx.beginPath();
        ctx.roundRect(
            this.x,
            this.y,
            this.width,
            this.height,
            7
        );

        ctx.fill();
        ctx.restore();
    }

    move(direction) {
        if (direction === "up") {
            this.y -= this.speed;
        }

        if (direction === "down") {
            this.y += this.speed;
        }

        // Evitar que la paleta salga del canvas
        this.y = Math.max(
            0,
            Math.min(
                canvas.height - this.height,
                this.y
            )
        );
    }

    autoMove(balls) {
        // La computadora sigue la pelota que se
        // encuentre más cerca de su paleta.
        const approachingBalls = balls.filter(
            ball => ball.speedX > 0
        );

        const target = approachingBalls.length > 0
            ? approachingBalls.reduce((closest, ball) =>
                ball.x > closest.x ? ball : closest
            )
            : balls[0];

        const center = this.y + this.height / 2;

        if (target.y < center - 10) {
            this.move("up");
        } else if (target.y > center + 10) {
            this.move("down");
        }
    }
}

// ======================================
// CLASE PRINCIPAL DEL JUEGO
// ======================================

class Game {
    constructor() {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Las cinco pelotas, cada una con
        // diferente tamaño, color y velocidad.
        this.balls = [
            new Ball(
                centerX, centerY - 120,
                7, 4, 3,
                "#ff4f9a"
            ),

            new Ball(
                centerX, centerY - 60,
                10, -3.7, 3.8,
                "#e879f9"
            ),

            new Ball(
                centerX, centerY,
                13, 3.4, -3.5,
                "#ec4899"
            ),

            new Ball(
                centerX, centerY + 70,
                9, -4.2, -2.9,
                "#fb7185"
            ),

            new Ball(
                centerX, centerY + 130,
                6, 4.5, 3.6,
                "#be185d"
            )
        ];

        // Paleta del jugador
        this.paddle1 = new Paddle(
            22,
            centerY - 55,
            13,
            110,
            "#db2777"
        );

        // Paleta de la computadora
        this.paddle2 = new Paddle(
            canvas.width - 35,
            centerY - 55,
            13,
            110,
            "#a21caf"
        );

        this.keys = {};

        this.playerScore = 0;
        this.cpuScore = 0;
    }

    // ======================================
    // DIBUJAR ELEMENTOS
    // ======================================

    draw() {
        ctx.clearRect(
            0, 0,
            canvas.width,
            canvas.height
        );

        // Línea central rosa
        ctx.save();

        ctx.strokeStyle = "#f3a6c8";
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 12]);

        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.stroke();

        ctx.restore();

        // Dibujar las cinco pelotas
        this.balls.forEach(ball => ball.draw());

        // Dibujar las paletas
        this.paddle1.draw();
        this.paddle2.draw();

        // Marcador
        ctx.fillStyle = "#9d174d";
        ctx.font = "bold 42px Arial";
        ctx.textAlign = "center";

        ctx.fillText(
            this.playerScore,
            canvas.width * 0.25,
            55
        );

        ctx.fillText(
            this.cpuScore,
            canvas.width * 0.75,
            55
        );
    }

    // ======================================
    // DETECTAR COLISIONES
    // ======================================

    checkCollision(ball, paddle, side) {
        const overlapsY =
            ball.y + ball.radius >= paddle.y &&
            ball.y - ball.radius <=
                paddle.y + paddle.height;

        const overlapsX =
            ball.x + ball.radius >= paddle.x &&
            ball.x - ball.radius <=
                paddle.x + paddle.width;

        if (!overlapsX || !overlapsY) {
            return;
        }

        // Pelota contra la paleta izquierda
        if (side === "left" && ball.speedX < 0) {
            ball.x =
                paddle.x + paddle.width + ball.radius;

            ball.speedX = Math.abs(ball.speedX);

            ball.speedY +=
                ((ball.y -
                    (paddle.y + paddle.height / 2)) /
                    (paddle.height / 2)) * 0.8;
        }

        // Pelota contra la paleta derecha
        if (side === "right" && ball.speedX > 0) {
            ball.x = paddle.x - ball.radius;

            ball.speedX = -Math.abs(ball.speedX);

            ball.speedY +=
                ((ball.y -
                    (paddle.y + paddle.height / 2)) /
                    (paddle.height / 2)) * 0.8;
        }
    }

    // ======================================
    // ACTUALIZAR EL JUEGO
    // ======================================

    update() {
        // Movimiento del jugador
        if (this.keys["ArrowUp"]) {
            this.paddle1.move("up");
        }

        if (this.keys["ArrowDown"]) {
            this.paddle1.move("down");
        }

        // Movimiento automático de la computadora
        this.paddle2.autoMove(this.balls);

        // Actualizar cada pelota
        this.balls.forEach(ball => {
            ball.move();

            this.checkCollision(
                ball,
                this.paddle1,
                "left"
            );

            this.checkCollision(
                ball,
                this.paddle2,
                "right"
            );

            // Punto para la computadora
            if (ball.x + ball.radius < 0) {
                this.cpuScore++;
                ball.reset(1);
            }

            // Punto para el jugador
            if (ball.x - ball.radius > canvas.width) {
                this.playerScore++;
                ball.reset(-1);
            }
        });
    }

    // ======================================
    // CONTROLES DEL TECLADO
    // ======================================

    handleInput() {
        window.addEventListener("keydown", event => {
            if (
                event.key === "ArrowUp" ||
                event.key === "ArrowDown"
            ) {
                event.preventDefault();
            }

            this.keys[event.key] = true;
        });

        window.addEventListener("keyup", event => {
            this.keys[event.key] = false;
        });

        window.addEventListener("blur", () => {
            this.keys = {};
        });
    }

    // ======================================
    // BUCLE PRINCIPAL
    // ======================================

    run() {
        this.handleInput();

        const gameLoop = () => {
            this.update();
            this.draw();

            requestAnimationFrame(gameLoop);
        };

        gameLoop();
    }
}

// ======================================
// INICIAR EL JUEGO
// ======================================

const game = new Game();
game.run();
