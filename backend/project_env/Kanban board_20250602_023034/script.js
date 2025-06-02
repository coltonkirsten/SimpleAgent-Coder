// Global variables
let currentEditingTask = null;
let currentColumn = null;
let currentProjectId = null;
let projects = {};

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    loadProjects();
    initializeDefaultProject();
    updateProjectDisplay();
});

// Project Management Functions
function initializeDefaultProject() {
    if (Object.keys(projects).length === 0) {
        const defaultProject = {
            id: 'project-1',
            name: 'My First Project',
            createdAt: new Date().toISOString(),
            tasks: {
                todo: [],
                inprogress: [],
                done: []
            }
        };
        
        // Add the existing sample task to the default project
        const sampleTask = {
            id: 'task-1',
            title: 'TASK',
            details: 'details...',
            createdAt: new Date().toISOString()
        };
        defaultProject.tasks.todo.push(sampleTask);
        
        projects[defaultProject.id] = defaultProject;
        currentProjectId = defaultProject.id;
        saveProjects();
    } else {
        // Load the first project if no current project is set
        if (!currentProjectId || !projects[currentProjectId]) {
            currentProjectId = Object.keys(projects)[0];
        }
    }
    
    loadCurrentProject();
}

function loadProjects() {
    const saved = localStorage.getItem('kanban-projects');
    if (saved) {
        projects = JSON.parse(saved);
    }
    
    const savedCurrentId = localStorage.getItem('kanban-current-project');
    if (savedCurrentId && projects[savedCurrentId]) {
        currentProjectId = savedCurrentId;
    }
}

function saveProjects() {
    localStorage.setItem('kanban-projects', JSON.stringify(projects));
    localStorage.setItem('kanban-current-project', currentProjectId);
}

function loadCurrentProject() {
    if (!currentProjectId || !projects[currentProjectId]) return;
    
    const project = projects[currentProjectId];
    
    // Update project name in UI
    document.getElementById('current-project-name').textContent = project.name;
    
    // Clear all columns
    document.getElementById('todo').querySelector('.task-list').innerHTML = '';
    document.getElementById('inprogress').querySelector('.task-list').innerHTML = '';
    document.getElementById('done').querySelector('.task-list').innerHTML = '';
    
    // Load tasks into columns
    Object.keys(project.tasks).forEach(column => {
        const taskList = document.getElementById(column).querySelector('.task-list');
        project.tasks[column].forEach(task => {
            addTaskToDOM(task, taskList);
        });
    });
}

function addTaskToDOM(task, taskList) {
    const taskElement = document.createElement('div');
    taskElement.className = 'task';
    taskElement.draggable = true;
    taskElement.setAttribute('data-task-id', task.id);
    
    taskElement.innerHTML = `
        <div class="task-title">${task.title}</div>
        <div class="task-details">${task.details}</div>
        <div class="task-actions">
            <button onclick="editTask(this)">Edit</button>
            <button onclick="deleteTask(this)">Delete</button>
        </div>
    `;
    
    // Add event listeners
    taskElement.addEventListener('dragstart', drag);
    taskElement.addEventListener('dragend', function() {
        this.classList.remove('dragging');
        this.style.display = 'block';
    });
    
    taskList.appendChild(taskElement);
}

function saveCurrentProject() {
    if (!currentProjectId || !projects[currentProjectId]) return;
    
    const project = projects[currentProjectId];
    
    // Reset tasks
    project.tasks = { todo: [], inprogress: [], done: [] };
    
    // Save current state
    ['todo', 'inprogress', 'done'].forEach(columnId => {
        const taskList = document.getElementById(columnId).querySelector('.task-list');
        const tasks = taskList.querySelectorAll('.task');
        
        tasks.forEach(taskElement => {
            const task = {
                id: taskElement.getAttribute('data-task-id') || generateId(),
                title: taskElement.querySelector('.task-title').textContent,
                details: taskElement.querySelector('.task-details').textContent,
                createdAt: new Date().toISOString()
            };
            project.tasks[columnId].push(task);
        });
    });
    
    saveProjects();
}

function generateId() {
    return 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// Projects Modal Functions
function openProjectsModal() {
    updateProjectsList();
    document.getElementById('projectsModal').style.display = 'block';
}

function closeProjectsModal() {
    document.getElementById('projectsModal').style.display = 'none';
    hideNewProjectForm();
}

function updateProjectsList() {
    const projectsList = document.getElementById('projects-list');
    projectsList.innerHTML = '';
    
    if (Object.keys(projects).length === 0) {
        projectsList.innerHTML = '<div class="no-projects">No projects yet. Create your first project!</div>';
        return;
    }
    
    Object.values(projects).forEach(project => {
        const totalTasks = Object.values(project.tasks).reduce((sum, tasks) => sum + tasks.length, 0);
        const completedTasks = project.tasks.done.length;
        
        const projectItem = document.createElement('div');
        projectItem.className = `project-item ${project.id === currentProjectId ? 'active' : ''}`;
        projectItem.onclick = () => switchProject(project.id);
        
        projectItem.innerHTML = `
            <div class="project-info-item">
                <div class="project-name">${project.name}</div>
                <div class="project-meta">${totalTasks} tasks • ${completedTasks} completed</div>
            </div>
            <div class="project-actions">
                <button class="delete-project-btn" onclick="deleteProject('${project.id}', event)">Delete</button>
            </div>
        `;
        
        projectsList.appendChild(projectItem);
    });
}

function showNewProjectForm() {
    document.getElementById('new-project-form').style.display = 'block';
    document.getElementById('new-project-name').focus();
}

function hideNewProjectForm() {
    document.getElementById('new-project-form').style.display = 'none';
    document.getElementById('new-project-name').value = '';
}

function createProject() {
    const nameInput = document.getElementById('new-project-name');
    const name = nameInput.value.trim();
    
    if (!name) {
        alert('Please enter a project name');
        return;
    }
    
    const projectId = 'project-' + Date.now();
    const newProject = {
        id: projectId,
        name: name,
        createdAt: new Date().toISOString(),
        tasks: {
            todo: [],
            inprogress: [],
            done: []
        }
    };
    
    projects[projectId] = newProject;
    saveProjects();
    hideNewProjectForm();
    updateProjectsList();
}

function switchProject(projectId) {
    if (projectId === currentProjectId) {
        closeProjectsModal();
        return;
    }
    
    // Save current project before switching
    saveCurrentProject();
    
    currentProjectId = projectId;
    loadCurrentProject();
    closeProjectsModal();
    saveProjects();
}

function deleteProject(projectId, event) {
    event.stopPropagation();
    
    if (Object.keys(projects).length === 1) {
        alert('Cannot delete the last project. Create a new project first.');
        return;
    }
    
    const project = projects[projectId];
    if (!confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
        return;
    }
    
    delete projects[projectId];
    
    // If we deleted the current project, switch to another one
    if (currentProjectId === projectId) {
        currentProjectId = Object.keys(projects)[0];
        loadCurrentProject();
    }
    
    saveProjects();
    updateProjectsList();
}

function updateProjectDisplay() {
    // This function can be called to refresh the project name display
    if (currentProjectId && projects[currentProjectId]) {
        document.getElementById('current-project-name').textContent = projects[currentProjectId].name;
    }
}

// Enhanced Task Management Functions
function addTask(columnId) {
    currentColumn = columnId;
    currentEditingTask = null;
    
    document.getElementById('modal-title').textContent = 'Add New Task';
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDetails').value = '';
    document.getElementById('taskModal').style.display = 'block';
}

function editTask(button) {
    const task = button.closest('.task');
    currentEditingTask = task;
    
    const title = task.querySelector('.task-title').textContent;
    const details = task.querySelector('.task-details').textContent;
    
    document.getElementById('modal-title').textContent = 'Edit Task';
    document.getElementById('taskTitle').value = title;
    document.getElementById('taskDetails').value = details;
    document.getElementById('taskModal').style.display = 'block';
}

function deleteTask(button) {
    if (confirm('Are you sure you want to delete this task?')) {
        const task = button.closest('.task');
        task.remove();
        saveCurrentProject();
    }
}

function closeModal() {
    document.getElementById('taskModal').style.display = 'none';
    currentEditingTask = null;
    currentColumn = null;
}

// Form submission
document.getElementById('taskForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const title = document.getElementById('taskTitle').value.trim();
    const details = document.getElementById('taskDetails').value.trim();
    
    if (!title) {
        alert('Please enter a task title');
        return;
    }
    
    if (currentEditingTask) {
        // Edit existing task
        currentEditingTask.querySelector('.task-title').textContent = title;
        currentEditingTask.querySelector('.task-details').textContent = details || 'No details provided';
    } else {
        // Create new task
        const taskData = {
            id: generateId(),
            title: title,
            details: details || 'No details provided',
            createdAt: new Date().toISOString()
        };
        
        const taskList = document.querySelector(`#${currentColumn} .task-list`);
        addTaskToDOM(taskData, taskList);
    }
    
    saveCurrentProject();
    closeModal();
});

// Drag and Drop Functions
function allowDrop(ev) {
    ev.preventDefault();
    ev.currentTarget.classList.add('drag-over');
}

function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.outerHTML);
    ev.dataTransfer.setData("taskId", ev.target.getAttribute('data-task-id') || '');
    ev.target.classList.add('dragging');
    
    ev.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
        ev.target.style.display = 'none';
    }, 0);
}

function drop(ev) {
    ev.preventDefault();
    ev.currentTarget.classList.remove('drag-over');
    
    const data = ev.dataTransfer.getData("text");
    const taskList = ev.currentTarget;
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = data;
    const newTask = tempDiv.firstChild;
    
    // Add event listeners again to the recreated element
    newTask.addEventListener('dragstart', drag);
    newTask.addEventListener('dragend', function() {
        this.classList.remove('dragging');
        this.style.display = 'block';
    });
    
    taskList.appendChild(newTask);
    
    // Remove the original task
    const allTasks = document.querySelectorAll('.task[style*="display: none"]');
    allTasks.forEach(task => task.remove());
    
    saveCurrentProject();
}

// Remove drag-over class when dragging leaves
document.addEventListener('dragleave', function(e) {
    if (e.target.classList.contains('task-list')) {
        e.target.classList.remove('drag-over');
    }
});

// Enhanced event listeners
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
        closeProjectsModal();
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        addTask('todo');
    }
});

// Close modals when clicking outside
window.addEventListener('click', function(e) {
    const taskModal = document.getElementById('taskModal');
    const projectsModal = document.getElementById('projectsModal');
    
    if (e.target === taskModal) {
        closeModal();
    }
    if (e.target === projectsModal) {
        closeProjectsModal();
    }
});

// Handle Enter key in new project form
document.getElementById('new-project-name').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        createProject();
    }
    if (e.key === 'Escape') {
        hideNewProjectForm();
    }
});

// Auto-save on window beforeunload
window.addEventListener('beforeunload', function() {
    saveCurrentProject();
});