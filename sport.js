// sport.js (frontend for each sport page)
document.addEventListener("DOMContentLoaded", () => {
  const message = document.getElementById("message");
  const uploadForm = document.getElementById("uploadForm");
  const preview = document.getElementById("preview");
  const recordBtn = document.getElementById("recordBtn");
  const stopBtn = document.getElementById("stopBtn");

  // Check user login
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) {
    alert("Please login first!");
    window.location.href = "login.html";
    return;
  }

  // Detect sport from HTML file name
  const sport = window.location.pathname.split("/").pop().replace(".html", "");

  // ===== Upload Video (form submit) =====
  if (uploadForm) {
    uploadForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(uploadForm);
      formData.append("user", JSON.stringify(user));

      try {
        const res = await fetch(`/upload/${sport}`, { method: "POST", body: formData });
        const data = await res.json();

        if (data.success) {
          message.textContent = " Video uploaded successfully!";
          message.style.color = "green";
          // Save to local storage so profile can reload new uploads
          await refreshUploads();
        } else {
          message.textContent = "❌ " + data.message;
          message.style.color = "red";
        }
      } catch (err) {
        console.error(err);
        message.textContent = "❌ Upload failed. Try again.";
        message.style.color = "red";
      }
    });
  }

  // ===== Record Video =====
  let mediaRecorder;
  let recordedChunks = [];

  if (recordBtn && stopBtn && preview) {
    recordBtn.addEventListener("click", async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        preview.srcObject = stream;

        mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
        recordedChunks = [];

        mediaRecorder.ondataavailable = e => {
          if (e.data.size > 0) recordedChunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          const blob = new Blob(recordedChunks, { type: "video/webm" });
          const file = new File([blob], "recorded-video.webm");
          const formData = new FormData();
          formData.append("video", file);
          formData.append("user", JSON.stringify(user));

          try {
            const res = await fetch(`/upload/${sport}`, { method: "POST", body: formData });
            const data = await res.json();
            if (data.success) {
              message.textContent = "Recorded video uploaded successfully!";
              message.style.color = "green";
              await refreshUploads();
            } else {
              message.textContent = "❌ " + data.message;
              message.style.color = "red";
            }
          } catch (err) {
            console.error(err);
            message.textContent = "❌ Recording upload failed!";
            message.style.color = "red";
          }
        };

        mediaRecorder.start();
        recordBtn.style.display = "none";
        stopBtn.style.display = "inline-block";
      } catch (err) {
        alert("Camera access denied or not available.");
      }
    });

    stopBtn.addEventListener("click", () => {
      if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
      if (preview.srcObject) preview.srcObject.getTracks().forEach(track => track.stop());
      recordBtn.style.display = "inline-block";
      stopBtn.style.display = "none";
    });
  }

  // ===== Refresh uploads list (after upload/record) =====
  async function refreshUploads() {
    try {
      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      const data = await res.json();
      if (data.success && data.uploads) {
        localStorage.setItem("uploads", JSON.stringify(data.uploads));
      }
    } catch (err) {
      console.error("Could not refresh uploads:", err);
    }
  }
});