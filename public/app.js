const form = document.getElementById('task-form');
const taskIdInput = document.getElementById('task-id');
const titleInput = document.getElementById('title');
const descriptionInput = document.getElementById('description');
const statusInput = document.getElementById('status');
const priorityInput = document.getElementById('priority');
const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const message = document.getElementById('message');
const formTitle = document.getElementById('form-title');
const submitButton = document.getElementById('submit-button');
const cancelButton = document.getElementById('cancel-button');

function showMessage(text, isError = false) {
  message.textContent = text;
  message.style.color = isError ? '#dc2626' : '#16a34a';
}

function resetForm() {
  form.reset();
  taskIdInput.value = '';
  statusInput.value = 'todo';
  priorityInput.value = 'medium';
  formTitle.textContent = 'Create Task';
  submitButton.textContent = 'Create Task';
  cancelButton.classList.add('hidden');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.message || 'Request failed.');
  }

  return data;
}

function renderTasks(tasks) {
  taskList.innerHTML = '';
  emptyState.classList.toggle('hidden', tasks.length > 0);

  tasks.forEach((task) => {
    const article = document.createElement('article');
    article.className = 'task';
    article.innerHTML = `
      <div class="task-top">
        <div>
          <h3>${escapeHtml(task.title)}</h3>
          <span class="badge">${escapeHtml(task.status)}</span>
          <span class="badge">${escapeHtml(task.priority)} priority</span>
        </div>
        <span class="meta">${new Date(task.updatedAt).toLocaleString()}</span>
      </div>
      <p class="task-description">${escapeHtml(task.description || 'No description')}</p>
      <div class="task-actions">
        <button class="edit" type="button" data-edit="${task._id}">Edit</button>
        <button class="danger" type="button" data-delete="${task._id}">Delete</button>
      </div>
    `;

    taskList.appendChild(article);
  });
}

async function loadTasks() {
  try {
    const tasks = await request('/api/tasks');
    renderTasks(tasks);
  } catch (error) {
    showMessage(error.message, true);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const id = taskIdInput.value;
  const task = {
    title: titleInput.value.trim(),
    description: descriptionInput.value.trim(),
    status: statusInput.value,
    priority: priorityInput.value
  };

  try {
    await request(id ? `/api/tasks/${id}` : '/api/tasks', {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });

    showMessage(id ? 'Task updated successfully.' : 'Task created successfully.');
    resetForm();
    await loadTasks();
  } catch (error) {
    showMessage(error.message, true);
  }
});

taskList.addEventListener('click', async (event) => {
  const editId = event.target.dataset.edit;
  const deleteId = event.target.dataset.delete;

  try {
    if (editId) {
      const task = await request(`/api/tasks/${editId}`);
      taskIdInput.value = task._id;
      titleInput.value = task.title;
      descriptionInput.value = task.description || '';
      statusInput.value = task.status;
      priorityInput.value = task.priority;
      formTitle.textContent = 'Edit Task';
      submitButton.textContent = 'Update Task';
      cancelButton.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (deleteId) {
      if (!confirm('Delete this task?')) return;

      await request(`/api/tasks/${deleteId}`, { method: 'DELETE' });
      showMessage('Task deleted successfully.');
      await loadTasks();
    }
  } catch (error) {
    showMessage(error.message, true);
  }
});

cancelButton.addEventListener('click', resetForm);
document.getElementById('refresh-button').addEventListener('click', loadTasks);

loadTasks();
