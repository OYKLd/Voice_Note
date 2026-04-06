class VoiceNotesManager {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.recordingStartTime = null;
        this.recordingTimer = null;
        this.currentAudioBlob = null;
        this.recordings = this.loadRecordings();
        this.currentRecordingId = null;
        
        this.initializeElements();
        this.bindEvents();
        this.renderRecordings();
    }

    initializeElements() {
        this.recordBtn = document.getElementById('recordBtn');
        this.recordingStatus = document.getElementById('recordingStatus');
        this.recordingTime = document.getElementById('recordingTime');
        this.audioNameSection = document.getElementById('audioNameSection');
        this.audioNameInput = document.getElementById('audioNameInput');
        this.saveNameBtn = document.getElementById('saveNameBtn');
        this.recordingsList = document.getElementById('recordingsList');
        this.audioModal = document.getElementById('audioModal');
        this.modalTitle = document.getElementById('modalTitle');
        this.audioPlayer = document.getElementById('audioPlayer');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.deleteBtn = document.getElementById('deleteBtn');
        this.closeModal = document.querySelector('.close');
    }

    bindEvents() {
        this.recordBtn.addEventListener('click', () => this.toggleRecording());
        this.saveNameBtn.addEventListener('click', () => this.saveRecordingWithName());
        this.audioNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveRecordingWithName();
        });
        
        this.closeModal.addEventListener('click', () => this.closeAudioModal());
        this.downloadBtn.addEventListener('click', () => this.downloadCurrentAudio());
        this.deleteBtn.addEventListener('click', () => this.deleteCurrentAudio());
        
        window.addEventListener('click', (e) => {
            if (e.target === this.audioModal) this.closeAudioModal();
        });
    }

    async toggleRecording() {
        if (!this.isRecording) {
            await this.startRecording();
        } else {
            this.stopRecording();
        }
    }

    async startRecording() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            this.mediaRecorder = new MediaRecorder(this.stream);
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };
            
            this.mediaRecorder.onstop = () => {
                this.currentAudioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                this.stream.getTracks().forEach(track => track.stop());
                this.showNameInput();
            };
            
            this.mediaRecorder.start();
            this.isRecording = true;
            this.recordingStartTime = Date.now();
            this.updateRecordingUI();
            this.startTimer();
            
        } catch (error) {
            console.error('Erreur lors de l\'accès au microphone:', error);
            alert('Impossible d\'accéder au microphone. Veuillez vérifier vos permissions.');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.stopTimer();
            this.updateRecordingUI();
        }
    }

    updateRecordingUI() {
        const recordIcon = this.recordBtn.querySelector('.record-icon');
        const recordText = this.recordBtn.querySelector('.record-text');
        
        if (this.isRecording) {
            this.recordBtn.classList.add('recording');
            recordText.textContent = 'Arrêter l\'enregistrement';
            this.recordingStatus.classList.remove('hidden');
        } else {
            this.recordBtn.classList.remove('recording');
            recordText.textContent = 'Commencer l\'enregistrement';
            this.recordingStatus.classList.add('hidden');
        }
    }

    startTimer() {
        this.recordingTimer = setInterval(() => {
            const elapsed = Date.now() - this.recordingStartTime;
            const seconds = Math.floor(elapsed / 1000);
            const minutes = Math.floor(seconds / 60);
            const displaySeconds = seconds % 60;
            this.recordingTime.textContent = 
                `${minutes.toString().padStart(2, '0')}:${displaySeconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    stopTimer() {
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
        this.recordingTime.textContent = '00:00';
    }

    showNameInput() {
        this.audioNameSection.classList.remove('hidden');
        this.audioNameInput.value = '';
        this.audioNameInput.focus();
        
        const now = new Date();
        const defaultName = `Enregistrement ${now.toLocaleDateString('fr-FR')} ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
        this.audioNameInput.placeholder = defaultName;
    }

    async saveRecordingWithName() {
        if (!this.currentAudioBlob) return;
        
        const name = this.audioNameInput.value.trim() || 
                    `Enregistrement ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
        
        const recording = {
            id: Date.now().toString(),
            name: name,
            blob: this.currentAudioBlob,
            duration: this.recordingTime.textContent,
            createdAt: new Date().toISOString(),
            size: this.currentAudioBlob.size
        };
        
        this.recordings.unshift(recording);
        this.saveRecordings();
        this.renderRecordings();
        
        this.audioNameSection.classList.add('hidden');
        this.currentAudioBlob = null;
        
        alert('Enregistrement sauvegardé avec succès !');
    }

    loadRecordings() {
        const stored = localStorage.getItem('voiceRecordings');
        if (!stored) return [];
        
        try {
            const parsed = JSON.parse(stored);
            return parsed.map(rec => ({
                ...rec,
                blob: this.base64ToBlob(rec.blobData, rec.mimeType || 'audio/webm')
            }));
        } catch (error) {
            console.error('Erreur lors du chargement des enregistrements:', error);
            return [];
        }
    }

    saveRecordings() {
        const recordingsToSave = this.recordings.map(rec => ({
            ...rec,
            blobData: this.blobToBase64(rec.blob),
            mimeType: rec.blob.type
        }));
        
        localStorage.setItem('voiceRecordings', JSON.stringify(recordingsToSave));
    }

    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    base64ToBlob(base64Data, mimeType) {
        const byteCharacters = atob(base64Data.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);
        
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    }

    renderRecordings() {
        if (this.recordings.length === 0) {
            this.recordingsList.innerHTML = '<p class="empty-state">Aucun enregistrement pour le moment</p>';
            return;
        }
        
        this.recordingsList.innerHTML = this.recordings.map(recording => `
            <div class="recording-item" data-id="${recording.id}">
                <div class="recording-info">
                    <div class="recording-name">${this.escapeHtml(recording.name)}</div>
                    <div class="recording-meta">
                        ${recording.duration} • ${this.formatDate(recording.createdAt)} • ${this.formatFileSize(recording.size)}
                    </div>
                </div>
                <div class="recording-actions">
                    <button class="play-btn" onclick="voiceNotesManager.playAudio('${recording.id}')">
                        Écouter
                    </button>
                    <button class="download-btn-small" onclick="voiceNotesManager.downloadAudio('${recording.id}')">
                        Télécharger
                    </button>
                    <button class="delete-btn-small" onclick="voiceNotesManager.deleteAudio('${recording.id}')">
                        Supprimer
                    </button>
                </div>
            </div>
        `).join('');
    }

    playAudio(id) {
        const recording = this.recordings.find(rec => rec.id === id);
        if (!recording) return;
        
        this.currentRecordingId = id;
        this.modalTitle.textContent = recording.name;
        
        const audioUrl = URL.createObjectURL(recording.blob);
        this.audioPlayer.src = audioUrl;
        
        this.audioModal.classList.remove('hidden');
        this.audioPlayer.play();
    }

    closeAudioModal() {
        this.audioModal.classList.add('hidden');
        this.audioPlayer.pause();
        this.audioPlayer.src = '';
        this.currentRecordingId = null;
    }

    downloadCurrentAudio() {
        if (!this.currentRecordingId) return;
        this.downloadAudio(this.currentRecordingId);
    }

    downloadAudio(id) {
        const recording = this.recordings.find(rec => rec.id === id);
        if (!recording) return;
        
        const audioUrl = URL.createObjectURL(recording.blob);
        const a = document.createElement('a');
        a.href = audioUrl;
        a.download = `${recording.name}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(audioUrl);
    }

    deleteCurrentAudio() {
        if (!this.currentRecordingId) return;
        
        if (confirm('Êtes-vous sûr de vouloir supprimer cet enregistrement ?')) {
            this.deleteAudio(this.currentRecordingId);
            this.closeAudioModal();
        }
    }

    deleteAudio(id) {
        const index = this.recordings.findIndex(rec => rec.id === id);
        if (index === -1) return;
        
        if (confirm('Êtes-vous sûr de vouloir supprimer cet enregistrement ?')) {
            this.recordings.splice(index, 1);
            this.saveRecordings();
            this.renderRecordings();
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return 'Aujourd\'hui';
        } else if (diffDays === 1) {
            return 'Hier';
        } else if (diffDays < 7) {
            return `Il y a ${diffDays} jours`;
        } else {
            return date.toLocaleDateString('fr-FR');
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
}

// Initialiser l'application
let voiceNotesManager;
document.addEventListener('DOMContentLoaded', () => {
    voiceNotesManager = new VoiceNotesManager();
});