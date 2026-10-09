// ======================================
// CONFIGURACIÓN DEL CANVAS
// ======================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const restartButton = document.getElementById("restartButton");

// ======================================
// CLASE PELOTA
// ======================================

class Ball {
    constructor(x, y, radius, speedX, speedY, color) {
        this.startX = x;
        this.startY = y;
        this.startSpeedX = speedX;
        this.startSpeedY = speedY;
        this.radius = radius;
        this.color = color;

        this.resetToStart();
    }

    resetToStart() {
        this.x = this.startX;
        this.y = this.startY;
        this.speedX = this.startSpeedX;
        this.speedY = this.startSpeedY;
        this.lastPaddleHit = "";
    }

    draw() {
        ctx.save();

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

        // Rebote contra la parte superior
        if (this.y - this.radius <= 0) {
            this.y = this.radius;
            this.speedY = Math.abs(this.speedY);
        }

        // Rebote contra la parte inferior
        if (this.y + this.radius >= canvas.height) {
            this.y = canvas.height - this.radius;
            this.speedY = -Math.abs(this.speedY);
        }
    }

    // Reiniciar pelota cuando sale del campo
    reset(direction) {
        this.x = canvas.width / 2;

        this.y =
            Math.random() * (canvas.height - 100) + 50;

        this.speedX =
            Math.abs(this.startSpeedX) * direction;

        this.speedY =
            (Math.random() < 0.5 ? -1 : 1) *
            Math.max(2.5, Math.abs(this.startSpeedY));

        this.lastPaddleHit = "";
    }
}

// ======================================
// CLASE PALETA
// ======================================

class Paddle {
    constructor(x, y, width, height, color, speed = 6) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.baseHeight = height;
        this.color = color;
        this.speed = speed;
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

        this.y = Math.max(
            0,
            Math.min(
                canvas.height - this.height,
                this.y
            )
        );
    }

    // ======================================
    // CPU INTELIGENTE
    // ======================================

    autoMove(balls) {
        // Solo considerar pelotas que se dirigen a la CPU
        const incoming = balls
            .filter(ball =>
                ball.speedX > 0 &&
                ball.x < this.x + this.width
            )
            .map(ball => {
                const distance =
                    this.x - (ball.x + ball.radius);

                const eta = Math.max(
                    0,
                    distance / ball.speedX
                );

                // Predecir la posición vertical al llegar
                const minY = ball.radius;
                const maxY = canvas.height - ball.radius;
                const range = maxY - minY;

                let predictedY =
                    ball.y + ball.speedY * eta;

                // Calcular los rebotes contra techo y suelo
                if (range > 0) {
                    let position =
                        (predictedY - minY) % (2 * range);

                    if (position < 0) {
                        position += 2 * range;
                    }

                    if (position > range) {
                        position = 2 * range - position;
                    }

                    predictedY = minY + position;
                }

                return {
                    ball: ball,
                    eta: eta,
                    targetY: predictedY
                };
            })
            .sort((a, b) => a.eta - b.eta);

        // Si ninguna pelota se acerca, volver al centro
        if (incoming.length === 0) {
            const centerY = canvas.height / 2;
            const desiredY = centerY - this.height / 2;
            const difference = desiredY - this.y;

            if (Math.abs(difference) > this.speed) {
                this.y +=
                    Math.sign(difference) * this.speed;
            } else {
                this.y = desiredY;
            }

            this.y = Math.max(
                0,
                Math.min(
                    canvas.height - this.height,
                    this.y
                )
            );

            return;
        }

        // Seleccionar la pelota que llegará primero
        const target = incoming[0];

        // Comprobar si hay varias pelotas que llegarán
        // en un intervalo corto y a alturas similares
        const simultaneous = incoming.filter(item =>
            item.eta <= target.eta + 12 &&
            Math.abs(item.targetY - target.targetY) <
                this.baseHeight
        );

        // Ampliar temporalmente la paleta para cubrir mejor
        // las pelotas que se aproximan en grupo
        if (simultaneous.length >= 2) {
            this.height = Math.min(
                canvas.height,
                this.baseHeight + 60
            );
        } else {
            this.height = this.baseHeight;
        }

        // Evitar que la paleta quede fuera de la cancha
        this.y = Math.max(
            0,
            Math.min(
                canvas.height - this.height,
                this.y
            )
        );

        // Centrar la paleta en el punto de impacto previsto
        const desiredY =
            target.targetY - this.height / 2;

        const difference = desiredY - this.y;

        // Velocidad elevada para reaccionar rápidamente
        const cpuSpeed = 13;

        if (Math.abs(difference) > cpuSpeed) {
            this.y += Math.sign(difference) * cpuSpeed;
        } else {
            this.y = desiredY;
        }

        // Limitar movimiento al área de juego
        this.y = Math.max(
            0,
            Math.min(
                canvas.height - this.height,
                this.y
            )
        );
    }
}

// ======================================
// CLASE PRINCIPAL DEL JUEGO
// ======================================

class Game {
    constructor() {
        this.keys = {};
        this.playerScore = 0;
        this.cpuScore = 0;

        // Cinco pelotas de diferentes tamaños y colores
        this.balls = [
            new Ball(
                400, 180,
                7, 4.0, 3.0,
                "#ff4f9a"
            ),

            new Ball(
                400, 240,
                10, -3.7, 3.8,
                "#e879f9"
            ),

            new Ball(
                400, 300,
                13, 3.4, -3.5,
                "#ec4899"
            ),

            new Ball(
                400, 370,
                9, -4.2, -2.9,
                "#fb7185"
            ),

            new Ball(
                400, 430,
                6, 4.5, 3.6,
                "#be185d"
            )
        ];

        // Paleta del jugador: más grande
        this.paddle1 = new Paddle(
            22,
            245,
            13,
            220,
            "#db2777",
            6
        );

        // Paleta del CPU: más pequeña, pero más rápida
        this.paddle2 = new Paddle(
            canvas.width - 35,
            225,
            13,
            110,
            "#a21caf",
            13
        );
    }

    // ======================================
    // DIBUJAR EL JUEGO
    // ======================================

    draw() {
        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        // Línea central
        ctx.save();

        ctx.strokeStyle = "#f3a6c8";
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 12]);

        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.stroke();

        ctx.restore();

        // Dibujar pelotas y paletas
        this.balls.forEach(ball => ball.draw());

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
    // COLISIONES ENTRE PELOTAS Y PALETAS
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
            // Permitir que vuelva a golpear una paleta
            // después de separarse de ella
            if (
                side === "left" &&
                ball.x >
                    paddle.x + paddle.width + ball.radius
            ) {
                ball.lastPaddleHit = "";
            }

            if (
                side === "right" &&
                ball.x < paddle.x - ball.radius
            ) {
                ball.lastPaddleHit = "";
            }

            return;
        }

        // Colisión con la paleta del jugador
        if (
            side === "left" &&
            ball.speedX < 0 &&
            ball.lastPaddleHit !== "left"
        ) {
            ball.x =
                paddle.x + paddle.width + ball.radius;

            ball.speedX = Math.abs(ball.speedX);

            ball.speedY +=
                (
                    (ball.y -
                        (paddle.y + paddle.height / 2)) /
                    (paddle.height / 2)
                ) * 0.8;

            ball.lastPaddleHit = "left";
        }

        // Colisión con la paleta del CPU
        if (
            side === "right" &&
            ball.speedX > 0 &&
            ball.lastPaddleHit !== "right"
        ) {
            ball.x = paddle.x - ball.radius;

            // Regresar pelota al jugador
            ball.speedX = -Math.abs(ball.speedX);

            ball.speedY +=
                (
                    (ball.y -
                        (paddle.y + paddle.height / 2)) /
                    (paddle.height / 2)
                ) * 0.8;

            ball.lastPaddleHit = "right";
        }
    }

    // ======================================
    // ACTUALIZAR EL JUEGO
    // ======================================

    update() {
        // Controles del jugador
        if (this.keys["ArrowUp"]) {
            this.paddle1.move("up");
        }

        if (this.keys["ArrowDown"]) {
            this.paddle1.move("down");
        }

        // Movimiento automático del CPU
        this.paddle2.autoMove(this.balls);

        // Actualizar cada pelota
        for (const ball of this.balls) {
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

            // Punto para CPU si la pelota sale por la izquierda
            if (ball.x + ball.radius < 0) {
                this.cpuScore++;
                ball.reset(1);
            }

            // Punto para jugador si la pelota sale por la derecha
            if (ball.x - ball.radius > canvas.width) {
                this.playerScore++;
                ball.reset(-1);
            }
        }
    }

    // ======================================
    // REINICIAR LA PARTIDA
    // ======================================

    resetGame() {
        this.playerScore = 0;
        this.cpuScore = 0;

        this.keys = {};

        // Restaurar las pelotas
        this.balls.forEach(ball => {
            ball.resetToStart();
        });

        // Restaurar la altura original del CPU
        this.paddle2.height = this.paddle2.baseHeight;

        // Centrar las paletas
        this.paddle1.y =
            canvas.height / 2 -
            this.paddle1.height / 2;

        this.paddle2.y =
            canvas.height / 2 -
            this.paddle2.height / 2;
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

        // Evitar teclas atascadas al cambiar de ventana
        window.addEventListener("blur", () => {
            this.keys = {};
        });

        // Botón de reinicio
        if (restartButton) {
            restartButton.addEventListener("click", () => {
                this.resetGame();
            });
        }
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