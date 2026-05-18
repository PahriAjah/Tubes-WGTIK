const URL = "https://teachablemachine.withgoogle.com/models/ibfsXeWdT/";

let model, webcam, maxPredictions;
let isRunning = false;
let expressionArray = [];
let lastGestureTime = 0;
const COOLDOWN_MS = 2000;
let resetTimeout = null;

// DOM Elements
const webcamContainer = document.getElementById("webcam-container");
const gestureText = document.getElementById("gestureText");
const expressionDiv = document.getElementById("expression");
const resultDiv = document.getElementById("result");
const btnStart = document.getElementById("btn-start");
const btnStop = document.getElementById("btn-stop");
const countdownOverlay = document.getElementById("countdown-overlay");
const countdownText = document.getElementById("countdown-text");

// Load the image model
async function loadModel() {
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    try {
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();
        console.log("Model loaded successfully");
    } catch (error) {
        console.error("Error loading model:", error);
        gestureText.innerText = "Gagal memuat model!";
        gestureText.style.color = "#ef4444"; // Red for error
    }
}

// Init function called on window load
async function init() {
    await loadModel();
}

async function startSystem() {
    if (isRunning) return;

    btnStart.disabled = true;
    gestureText.innerText = "Menyiapkan kamera...";
    gestureText.style.color = "var(--cyan-glow)";

    // Countdown Animation
    countdownOverlay.classList.remove("hidden");
    for (let i = 3; i > 0; i--) {
        countdownText.innerText = i;
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    countdownOverlay.classList.add("hidden");

    try {
        const flip = true; // whether to flip the webcam
        webcam = new tmImage.Webcam(320, 320, flip); // width, height, flip
        await webcam.setup(); // request access to the webcam
        await webcam.play();

        webcamContainer.innerHTML = "";
        webcamContainer.appendChild(webcam.canvas);

        isRunning = true;
        btnStart.disabled = true;
        btnStop.disabled = false;
        gestureText.innerText = "Mendeteksi...";

        window.requestAnimationFrame(loop);
    } catch (error) {
        console.error("Error starting webcam:", error);
        gestureText.innerText = "Akses kamera ditolak/gagal!";
        gestureText.style.color = "#ef4444";
        btnStart.disabled = false;
    }
}

function stopSystem() {
    if (!isRunning) return;

    isRunning = false;
    webcam.stop();
    webcamContainer.innerHTML = `
        <div id="countdown-overlay" class="hidden">
            <span id="countdown-text">3</span>
        </div>
    `;

    // Reset UI
    btnStart.disabled = false;
    btnStop.disabled = true;
    gestureText.innerText = "Berhenti";
    gestureText.style.color = "var(--cyan-glow)";
    expressionArray = [];
    updateExpressionUI();
    resultDiv.innerText = "-";
    if (resetTimeout) clearTimeout(resetTimeout);
}

async function loop() {
    if (!isRunning) return;

    webcam.update(); // update the webcam frame
    await predict();
    window.requestAnimationFrame(loop);
}

async function predict() {
    if (!model || !webcam) return;

    // predict can take in an image, video or canvas html element
    const predictions = await model.predict(webcam.canvas);

    let highestPrediction = { className: "", probability: 0 };

    for (let i = 0; i < maxPredictions; i++) {
        if (predictions[i].probability > highestPrediction.probability) {
            highestPrediction = predictions[i];
        }
    }

    // Threshold set to 0.95 (95%)
    if (highestPrediction.probability >= 0.95) {
        const currentTime = Date.now();
        // Check cooldown to avoid double input
        if (currentTime - lastGestureTime > COOLDOWN_MS) {
            processGesture(highestPrediction.className);
            lastGestureTime = currentTime;
        }
    }
}

function processGesture(gesture) {
    // Clear auto-reset timeout if user continues to input
    if (resetTimeout) {
        clearTimeout(resetTimeout);
        resetTimeout = null;
        if (expressionArray.length >= 3) {
            expressionArray = [];
            resultDiv.innerText = "-";
        }
    }

    let inputVal = null;
    gestureText.innerText = gesture;

    // Map the gesture to a math input based on Teachable Machine classes
    // Note: Adjust the case strings if your Teachable Machine classes are named differently
    switch (gesture) {
        case "Angka 1":
        case "1":
            inputVal = "1"; break;
        case "Angka 2":
        case "2":
            inputVal = "2"; break;
        case "Angka 3":
        case "3":
            inputVal = "3"; break;
        case "Angka 4":
        case "4":
            inputVal = "4"; break;
        case "Angka 5":
        case "5":
            inputVal = "5"; break;
        case "Tambah":
        case "+":
            inputVal = "+"; break;
        case "Kali":
        case "x":
        case "*":
            inputVal = "*"; break;
        case "Kurang":
        case "-":
            inputVal = "-"; break;
        case "Bagi":
        case "/":
            inputVal = "/"; break;
        case "Reset":
            expressionArray = [];
            resultDiv.innerText = "-";
            updateExpressionUI();
            return;
        default:
            // "Background" or unrecognized
            return;
    }

    if (inputVal !== null) {
        // Validation logic
        const isOperator = ["+", "-", "*", "/"].includes(inputVal);
        const lastInput = expressionArray[expressionArray.length - 1];
        const isLastOperator = ["+", "-", "*", "/"].includes(lastInput);

        // Ignore operator if it's the first input
        if (expressionArray.length === 0 && isOperator) {
            gestureText.innerText = "Masukkan angka terlebih dahulu!";
            return;
        }

        // Ignore consecutive operators
        if (isOperator && isLastOperator) {
            gestureText.innerText = "Operator tidak boleh berurutan!";
            return;
        }

        expressionArray.push(inputVal);
        updateExpressionUI();

        // Evaluate when expression reaches 3 parts (e.g., "1", "+", "2")
        if (expressionArray.length >= 3) {
            evaluateExpression();
        }
    }
}

function updateExpressionUI() {
    expressionDiv.innerText = expressionArray.length > 0 ? expressionArray.join(" ") : "Kosong";
}

function evaluateExpression() {
    try {
        const exprStr = expressionArray.join(" ");
        // Using eval inside try-catch is safe here because we control the inputs tightly
        const result = eval(exprStr);

        // Handle floating point precision issues (e.g., 0.1 + 0.2)
        const cleanResult = Number.isInteger(result) ? result : parseFloat(result.toFixed(2));

        resultDiv.innerText = cleanResult;

        // Auto-reset UI after 5 seconds
        resetTimeout = setTimeout(() => {
            expressionArray = [];
            updateExpressionUI();
            resultDiv.innerText = "-";
            gestureText.innerText = "Auto-reset. Mulai lagi!";
        }, 5000);
    } catch (e) {
        console.error("Error evaluating expression:", e);
        resultDiv.innerText = "Error";
    }
}

// Initialize on page load
window.onload = init;
