// Elements
const loginForm = document.getElementById("login-form");
const loginSection = document.getElementById("login-section");
const appSection = document.getElementById("app-section");
const loginError = document.getElementById("login-error");

const generateBtn = document.getElementById("generate-btn");
const loading = document.getElementById("loading");
const resultsSection = document.getElementById("results-section");

const bmiEl = document.getElementById("bmi");
const bmrEl = document.getElementById("bmr");
const tdeeEl = document.getElementById("tdee");
const intensityEl = document.getElementById("intensity");
const workoutContainer = document.getElementById("workout-container");

const tooEasyBtn = document.getElementById("too-easy");
const tooHardBtn = document.getElementById("too-hard");

let lastUserData = null;

/* ---------------- LOGIN ---------------- */
loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password || password.length < 4) {
        loginError.textContent = "Invalid credentials.";
        return;
    }

    loginSection.classList.add("hidden");
    appSection.classList.remove("hidden");
});

/* ---------------- GENERATE WORKOUT ---------------- */
generateBtn.addEventListener("click", async () => {
    const age = parseInt(document.getElementById("age").value);
    const weight = parseFloat(document.getElementById("weight").value);
    const height = parseFloat(document.getElementById("height").value);
    const goal = document.getElementById("goal").value;

    if (!age || !weight || !height || !goal) {
        alert("Please fill all fields properly.");
        return;
    }

    lastUserData = { age, weight, height, goal };
    await requestWorkout(lastUserData, null);
});

/* ---------------- FEEDBACK ---------------- */
tooEasyBtn.addEventListener("click", async () => {
    if (!lastUserData) return;
    await requestWorkout(lastUserData, "increase");
});

tooHardBtn.addEventListener("click", async () => {
    if (!lastUserData) return;
    await requestWorkout(lastUserData, "decrease");
});

/* ---------------- BACKEND CALL ---------------- */
async function requestWorkout(userData, adjustment) {
    try {
        loading.classList.remove("hidden");
        resultsSection.classList.add("hidden");

        const response = await fetch("http://localhost:5000/generate-workout", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                age: userData.age,
                weight: userData.weight,
                height: userData.height,
                goal: userData.goal,
                adjustment: adjustment
            })
        });

        if (!response.ok) {
            throw new Error("Server error");
        }

        const data = await response.json();
        displayResults(data);

    } catch (error) {
        console.error(error);
        alert("Something went wrong. Please try again.");
    } finally {
        loading.classList.add("hidden");
    }
}

/* ---------------- DISPLAY RESULTS ---------------- */
function displayResults(data) {
    bmiEl.textContent = data.bmi;
    bmrEl.textContent = data.bmr;
    tdeeEl.textContent = data.tdee;
    intensityEl.textContent = data.intensity;

    workoutContainer.innerHTML = "";

    data.workout.forEach(ex => {
        const card = document.createElement("div");
        card.classList.add("workout-card");

        card.innerHTML = `
            <h4>${ex.name}</h4>
            <p><strong>Sets:</strong> ${ex.sets}</p>
            <p><strong>Reps:</strong> ${ex.reps}</p>
        `;

        workoutContainer.appendChild(card);
    });

    resultsSection.classList.remove("hidden");
}
