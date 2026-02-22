// AgentFit - AI Gym Instructor
// Core Application Logic

class AgentFit {
    constructor() {
        this.currentIntensity = 5; // Default intensity (1-10)
        this.workoutHistory = [];
        this.init();
    }

    init() {
        this.cacheDOM();
        this.bindEvents();
    }

    cacheDOM() {
        this.dom = {
            age: document.getElementById('age'),
            weight: document.getElementById('weight'),
            height: document.getElementById('height'),
            goal: document.getElementById('goal'),
            generateBtn: document.getElementById('generateBtn'),
            loading: document.getElementById('loading'),
            results: document.getElementById('results'),
            error: document.getElementById('error'),
            bmi: document.getElementById('bmi'),
            bmr: document.getElementById('bmr'),
            tdee: document.getElementById('tdee'),
            intensity: document.getElementById('intensity'),
            reasoning: document.getElementById('reasoning'),
            exercises: document.getElementById('exercises'),
            tooEasy: document.getElementById('tooEasy'),
            tooHard: document.getElementById('tooHard')
        };
    }

    bindEvents() {
        this.dom.generateBtn.addEventListener('click', () => this.generateWorkout());
        this.dom.tooEasy.addEventListener('click', () => this.adjustIntensity('easy'));
        this.dom.tooHard.addEventListener('click', () => this.adjustIntensity('hard'));
    }

    // Fitness Calculations
    calculateBMI(weight, height) {
        const heightInMeters = height / 100;
        return (weight / (heightInMeters * heightInMeters)).toFixed(1);
    }

    calculateBMR(weight, height, age, goal) {
        // Mifflin-St Jeor Equation (assuming male default, can be extended)
        return Math.round((10 * weight) + (6.25 * height) - (5 * age) + 5);
    }

    calculateTDEE(bmr, goal) {
        const activityMultipliers = {
            'lose_fat': 1.55,  // Moderate activity for fat loss
            'gain_muscle': 1.65,  // Higher activity for muscle gain
            'bulk': 1.75  // High activity for bulking
        };
        return Math.round(bmr * (activityMultipliers[goal] || 1.55));
    }

    // Determine initial intensity based on user profile
    calculateInitialIntensity(bmi, goal) {
        let baseIntensity = 5;

        // Adjust based on BMI
        if (bmi <= 18.5) baseIntensity = 4;  // Underweight - start easier
        else if (bmi <= 25) baseIntensity = 6;  // Normal weight - moderate
        else if (bmi <= 30) baseIntensity = 5;  // Overweight - cautious start
        else baseIntensity = 4;  // Obese - start easier

        // Adjust based on goal
        if (goal === 'bulk') baseIntensity += 2;
        else if (goal === 'gain_muscle') baseIntensity += 1;

        // Clamp to valid range
        return Math.max(1, Math.min(10, baseIntensity));
    }

    // Generate AI workout prompt
    generateAIPrompt(userProfile) {
        return {
            model: "asi-1",
            messages: [
                {
                    role: "system",
                    content: `You are a professional fitness coach. Respond ONLY in valid JSON format. 
                    Generate a 4-exercise workout plan with detailed reasoning.
                    
                    Required JSON structure:
                    {
                        "reasoning": "Explain why this workout plan was chosen based on user's profile",
                        "exercises": [
                            {
                                "name": "Exercise name",
                                "sets": "Number of sets",
                                "reps": "Rep range",
                                "rest": "Rest period",
                                "notes": "Form tips or modifications"
                            }
                        ]
                    }
                    
                    Do NOT include any markdown formatting or text outside the JSON.`
                },
                {
                    role: "user",
                    content: `Create a intensity ${userProfile.intensity}/10 workout plan for:
                    - Age: ${userProfile.age}
                    - Weight: ${userProfile.weight}kg
                    - Height: ${userProfile.height}cm
                    - BMI: ${userProfile.bmi}
                    - BMR: ${userProfile.bmr} kcal
                    - TDEE: ${userProfile.tdee} kcal
                    - Goal: ${userProfile.goal.replace('_', ' ')}
                    
                    Consider the intensity level and user's fitness level based on BMI.`
                }
            ],
            temperature: 0.7,
            max_tokens: 1000
        };
    }

    // Main workout generation
    async generateWorkout() {
        this.resetUI();
        
        // Validate inputs
        const userProfile = this.getUserProfile();
        if (!userProfile) {
            this.showError('Please fill in all fields with valid values.');
            return;
        }

        // Show loading
        this.dom.loading.classList.remove('hidden');

        try {
            // Calculate metrics
            userProfile.bmi = this.calculateBMI(userProfile.weight, userProfile.height);
            userProfile.bmr = this.calculateBMR(userProfile.weight, userProfile.height, userProfile.age, userProfile.goal);
            userProfile.tdee = this.calculateTDEE(userProfile.bmr, userProfile.goal);
            
            // Set initial intensity or use current
            if (!this.workoutHistory.length) {
                userProfile.intensity = this.calculateInitialIntensity(userProfile.bmi, userProfile.goal);
                this.currentIntensity = userProfile.intensity;
            } else {
                userProfile.intensity = this.currentIntensity;
            }

            // Call ASI:ONE API
            const aiResponse = await this.callAIAPI(userProfile);
            
            // Update UI with results
            this.displayResults(userProfile, aiResponse);
            
            // Save to history
            this.workoutHistory.push({
                timestamp: Date.now(),
                profile: userProfile,
                plan: aiResponse
            });

        } catch (error) {
            this.showError('Failed to generate workout plan. Please try again.');
            console.error('Error:', error);
        } finally {
            this.dom.loading.classList.add('hidden');
        }
    }

    // Get user profile from inputs
    getUserProfile() {
        const age = parseInt(this.dom.age.value);
        const weight = parseFloat(this.dom.weight.value);
        const height = parseInt(this.dom.height.value);
        const goal = this.dom.goal.value;

        if (!age || !weight || !height || !goal) {
            return null;
        }

        if (age < 10 || age > 100 || weight < 30 || weight > 200 || height < 100 || height > 250) {
            return null;
        }

        return { age, weight, height, goal };
    }

    // Call ASI:ONE API
    async callAIAPI(userProfile) {
        const prompt = this.generateAIPrompt(userProfile);
        
        const response = await fetch('https://api.asi1.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer YOUR_API_KEY_HERE' // Replace with your actual API key
            },
            body: JSON.stringify(prompt)
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        
        // Parse JSON response from AI
        let aiContent = data.choices[0].message.content;
        
        // Clean up potential markdown code blocks
        aiContent = aiContent.replace(/```json/g, '').replace(/```/g, '').trim();
        
        return JSON.parse(aiContent);
    }

    // Display results
    displayResults(userProfile, aiResponse) {
        // Update metrics
        this.dom.bmi.textContent = userProfile.bmi;
        this.dom.bmr.textContent = `${userProfile.bmr} kcal`;
        this.dom.tdee.textContent = `${userProfile.tdee} kcal`;
        this.dom.intensity.textContent = `${userProfile.intensity}/10`;
        
        // Update reasoning
        this.dom.reasoning.textContent = aiResponse.reasoning;
        
        // Update exercises list
        this.dom.exercises.innerHTML = aiResponse.exercises.map(exercise => `
            <div class="exercise-card">
                <div class="exercise-name">${exercise.name}</div>
                <div class="exercise-details">
                    <div class="detail-item">Sets: <span>${exercise.sets}</span></div>
                    <div class="detail-item">Reps: <span>${exercise.reps}</span></div>
                    <div class="detail-item">Rest: <span>${exercise.rest}</span></div>
                </div>
                <div class="exercise-notes" style="margin-top: 0.75rem; font-size: 0.9rem; color: #888;">
                    💡 ${exercise.notes || 'Focus on proper form'}
                </div>
            </div>
        `).join('');

        // Show results section
        this.dom.results.classList.remove('hidden');
        
        // Scroll to results
        this.dom.results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Adjust intensity based on feedback
    adjustIntensity(feedback) {
        if (feedback === 'hard') {
            // User said "too hard" - decrease intensity
            this.currentIntensity = Math.max(1, this.currentIntensity - 1);
        } else if (feedback === 'easy') {
            // User said "too easy" - increase intensity
            this.currentIntensity = Math.min(10, this.currentIntensity + 1);
        }

        // Regenerate with new intensity
        this.generateWorkout();
    }

    // UI Helpers
    resetUI() {
        this.dom.results.classList.add('hidden');
        this.dom.error.classList.add('hidden');
    }

    showError(message) {
        this.dom.error.textContent = message;
        this.dom.error.classList.remove('hidden');
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.agentFit = new AgentFit();
});
