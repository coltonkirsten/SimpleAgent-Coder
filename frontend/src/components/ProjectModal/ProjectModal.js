import React, { useState, useEffect } from "react";
import { FiX, FiArrowRight, FiPlus, FiFolder } from "react-icons/fi";
import "./ProjectModal.css";

const ProjectModal = ({ isOpen, onClose, onOpenProject }) => {
  const [projects, setProjects] = useState([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const parseProjectName = (fullProjectName) => {
    const parts = fullProjectName.split("_");
    if (parts.length >= 3) {
      return parts.slice(0, -2).join("_");
    }
    return fullProjectName;
  };

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:8000/list_projects");
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createProject = async () => {
    if (!newProjectName.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch("http://localhost:8000/create_project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_name: newProjectName.trim() }),
      });

      if (response.ok) {
        setNewProjectName("");
        fetchProjects();
      } else {
        console.error("Failed to create project");
      }
    } catch (error) {
      console.error("Error creating project:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const deleteProject = async (fullProjectName) => {
    const displayName = parseProjectName(fullProjectName);
    if (!window.confirm(`Are you sure you want to delete "${displayName}"?`)) {
      return;
    }

    try {
      const response = await fetch("http://localhost:8000/delete_project", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_project_name: fullProjectName }),
      });

      if (response.ok) {
        fetchProjects();
      } else {
        console.error("Failed to delete project");
      }
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  const handleOpenProject = (fullProjectName) => {
    if (onOpenProject) {
      onOpenProject(fullProjectName);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      createProject();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="project-modal-overlay" onClick={onClose}>
      <div className="project-modal" onClick={(e) => e.stopPropagation()}>
        <div className="project-modal-header">
          <h2>
            <FiFolder className="header-icon" />
            Project Manager
          </h2>
          <button className="close-button" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="project-modal-content">
          <div className="create-project-section">
            <h3>Create New Project</h3>
            <div className="create-project-form">
              <input
                type="text"
                placeholder="Enter project name..."
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isCreating}
                className="project-name-input"
              />
              <button
                onClick={createProject}
                disabled={isCreating || !newProjectName.trim()}
                className="create-button"
              >
                <FiPlus />
                {isCreating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>

          <div className="projects-list-section">
            <h3>Existing Projects ({projects.length})</h3>

            {isLoading ? (
              <div className="loading-message">Loading projects...</div>
            ) : projects.length === 0 ? (
              <div className="no-projects-message">
                No projects found. Create your first project above!
              </div>
            ) : (
              <div className="projects-list">
                {projects.map((project, index) => (
                  <div key={index} className="project-item">
                    <div className="project-name">
                      {parseProjectName(project)}
                    </div>
                    <div className="project-actions">
                      <button
                        className="open-button"
                        onClick={() => handleOpenProject(project)}
                        title="Open Project"
                      >
                        <FiArrowRight />
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => deleteProject(project)}
                        title="Delete Project"
                      >
                        <FiX />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectModal;
