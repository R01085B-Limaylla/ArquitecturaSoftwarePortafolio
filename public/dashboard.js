function showTab(tabId) {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.getElementById(tabId).classList.add('active');
}

function logout() {
  fetch("/logout", { method: "POST" })
    .then(() => window.location.href = "/");
}

// Obtener datos del usuario desde el servidor
fetch("/api/user")
  .then(res => res.json())
  .then(user => {
    document.getElementById("userRole").textContent = user.role;
    document.getElementById("nombreAlumno").textContent = user.username;

    if (user.role === "admin") {
      document.getElementById("adminActions").classList.remove("hidden");
    }
  })
  .catch(() => {
    alert("⚠️ Sesión expirada. Vuelve a iniciar sesión.");
    window.location.href = "/";
  });

document.getElementById("uploadForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);

  const res = await fetch("http://localhost:3000/upload", {
    method: "POST",
    credentials: "include",
    body: formData
  });

  const data = await res.json();
  alert(data.message);

  if (res.ok) {
    loadFiles(formData.get("semana")); // recargar la vista de esa semana
  }
});

async function loadFiles(semana) {
  const res = await fetch(`http://localhost:3000/files/${semana}`, { credentials: "include" });
  const files = await res.json();

  const container = document.getElementById(`semana-${semana}`);
  container.innerHTML = ""; // limpiar antes de renderizar

  files.forEach(file => {
    const card = document.createElement("div");
    card.className = "card";

    let preview = "";
    if (file.filename.match(/\.(png|jpg|jpeg|gif)$/i)) {
      // Vista previa de imagen
      preview = `<img src="http://localhost:3000/uploads/${file.filename}" class="preview-img">`;
    } else if (file.filename.endsWith(".pdf")) {
      // Vista previa de PDF (embed, más compatible que iframe en algunos navegadores)
      preview = `
        <embed src="http://localhost:3000/uploads/${file.filename}#toolbar=0&navpanes=0&scrollbar=0"
               type="application/pdf"
               width="100%"
               height="500px"
               style="border:1px solid #555; border-radius:8px;">
      `;
    } else {
      // Ícono genérico
      preview = `<img src="file_icon.png" class="preview-icon">`;
    }

    card.innerHTML = `
      <div class="preview">${preview}</div>
      <h3>${file.title}</h3>
      <div class="actions">
        <a href="http://localhost:3000/download/${file.filename}" target="_blank" class="btn btn-green">Descargar</a>
        <button onclick="deleteFile('${file.filename}', ${semana})" class="btn btn-red">Eliminar</button>
      </div>
    `;

    container.appendChild(card);
  });
}

// Función eliminar archivo
async function deleteFile(filename, semana) {
  if (!confirm("¿Seguro que quieres eliminar este archivo?")) return;

  const res = await fetch(`http://localhost:3000/delete/${filename}`, {
    method: "DELETE",
    credentials: "include"
  });

  const data = await res.json();
  alert(data.message);

  if (res.ok) {
    loadFiles(semana);
  }
}

// cargar todas las semanas al iniciar
for (let i = 1; i <= 16; i++) {
  loadFiles(i);
}

function viewFile(filename) {
  window.open(`${API_URL}/uploads/${filename}`, "_blank");
}
