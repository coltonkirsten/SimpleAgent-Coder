// Button count logic
let count = 0;
const button = document.getElementById('clickBtn');
const countDisplay = document.getElementById('count');

button.addEventListener('click', function() {
    count++;
    countDisplay.textContent = `Count: ${count}`;
});

// Greeting logic
const nameForm = document.getElementById('nameForm');
const usernameInput = document.getElementById('username');
const greeting = document.getElementById('greeting');

nameForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const name = usernameInput.value.trim();
    if(name) {
        greeting.textContent = `Hello ${name}!`;
        nameForm.style.display = 'none';
    }
});
