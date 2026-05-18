const URL = "https://teachablemachine.withgoogle.com/models/ibfsXeWdT/";

let model;
let webcam;
let expression = [];
let cooldown = false;
let isRunning = false;

// START SYSTEM
async function startSystem(){

    const countdown =
        document.getElementById("countdown");

    countdown.style.display = "flex";

    const texts = ["3","2","1","GO!"];

    for(const text of texts){

        countdown.innerHTML = text;

        await new Promise(resolve =>
            setTimeout(resolve,1000)
        );
    }
    countdown.style.display = "none";
    // CEGAH DOUBLE START
    if(isRunning){
    return;
}
isRunning = true;
init();
}

// INIT
async function init(){
    // HAPUS WEBCAM LAMA
    document.getElementById("webcam-container")
    .innerHTML = "";

    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    model =
        await tmImage.load(modelURL, metadataURL);

    webcam =
        new tmImage.Webcam(320,320,true);

    await webcam.setup();

    await webcam.play();

    document.getElementById("webcam-container")
        .appendChild(webcam.canvas);

    window.requestAnimationFrame(loop);
}


// LOOP
async function loop(){
    
    // STOP LOOP JIKA SYSTEM OFF
    if(!isRunning){
        return;
    }
    webcam.update();
    await predict();
    window.requestAnimationFrame(loop);
}

// PREDICT
async function predict(){

    const prediction =
        await model.predict(webcam.canvas);

    let highestPrediction = prediction[0];

    for(let i=1;i<prediction.length;i++){

        if(
            prediction[i].probability >
            highestPrediction.probability
        ){

            highestPrediction = prediction[i];
        }
    }

    // CONFIDENCE
    if(
        highestPrediction.probability > 0.95 &&
        !cooldown
    ){

        cooldown = true;

        const gesture =
            highestPrediction.className;

        document.getElementById("gestureText")
            .innerHTML =
            "Detected: " + gesture;

        processGesture(gesture);

        setTimeout(()=>{

            cooldown = false;

        },2000);
    }
}


// PROCESS GESTURE
function processGesture(gesture){

    // ANGKA
    if(gesture == "Angka 1"){
        expression.push("1");
    }

    if(gesture == "Angka 2"){
        expression.push("2");
    }

    if(gesture == "Angka 3"){
        expression.push("3");
    }

    // OPERATOR
    if(gesture == "Tambah"){
        expression.push("+");
    }

    if(gesture == "Kali"){
        expression.push("*");
    }

    // RESET
    if(gesture == "Reset"){

        expression = [];

        document.getElementById("expression")
            .innerHTML = "";

        document.getElementById("result")
            .innerHTML = "RESET";

        setTimeout(()=>{

            document.getElementById("result")
                .innerHTML = "";

        },1500);

        return;
    }

    // TAMPILKAN
    document.getElementById("expression")
        .innerHTML =
        expression.join(" ");

    // HITUNG
    if(expression.length == 3){

        try{

            const hasil =
                eval(expression.join(""));

            document.getElementById("result")
                .innerHTML =
                expression.join(" ")
                + " = "
                + hasil;

        }catch{

            document.getElementById("result")
                .innerHTML = "ERROR";
        }

        // RESET AUTO
        setTimeout(()=>{

            expression = [];

            document.getElementById("expression")
                .innerHTML = "";

            document.getElementById("result")
                .innerHTML = "";

        },5000);
    }
}

// STOP SYSTEM
function stopSystem(){
    isRunning = false;

    // STOP CAMERA
    if(webcam){
        webcam.stop();
    }

    // HAPUS WEBCAM
    document.getElementById("webcam-container")
        .innerHTML = "";

    // RESET UI
    document.getElementById("gestureText")
        .innerHTML = "Projek Selesasi";

    document.getElementById("expression")
        .innerHTML = "";

    document.getElementById("result")
        .innerHTML = "";

    // RESET DATA
    expression = [];

    cooldown = false;
}
