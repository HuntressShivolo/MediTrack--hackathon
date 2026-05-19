// Medication Tracker App - State Management & Persistence

class MedicationApp {
  constructor() {
    this.medications = [];
    this.history = [];
    this.deletedItems = [];
    this.schedulerInterval = null;
    this.notificationPermission = 'default';
    this.streak = 0;
    this.lastOpenedDate = null;
    this.theme = 'dark';
    this.interactions = this.loadInteractionsDatabase();
    this.init();
  }

  // Initialize app - load data from localStorage
  init() {
    this.loadFromStorage();
    this.checkDailyReset();
    this.checkNotificationPermission();
    this.checkLowStock();
    this.startScheduler();
    this.render();
    this.attachEventListeners();
  }

  // Load medication interactions database
  loadInteractionsDatabase() {
    return {
      'warfarin': ['aspirin', 'ibuprofen', 'vitamin k'],
      'aspirin': ['warfarin', 'ibuprofen'],
      'ibuprofen': ['aspirin', 'warfarin'],
      'metformin': ['alcohol'],
      'statins': ['grapefruit'],
      'antibiotics': ['alcohol', 'dairy'],
      'blood pressure': ['grapefruit', 'alcohol']
    };
  }

  // Check for medication interactions
  checkInteractions(newMedName) {
    const warnings = [];
    const newMedLower = newMedName.toLowerCase();
    
    this.medications.forEach(existingMed => {
      const existingLower = existingMed.name.toLowerCase();
      
      // Check if new med interacts with existing
      Object.keys(this.interactions).forEach(key => {
        if (newMedLower.includes(key)) {
          this.interactions[key].forEach(interactsWith => {
            if (existingLower.includes(interactsWith)) {
              warnings.push(`⚠️ ${newMedName} may interact with ${existingMed.name}`);
            }
          });
        }
        
        if (existingLower.includes(key)) {
          this.interactions[key].forEach(interactsWith => {
            if (newMedLower.includes(interactsWith)) {
              warnings.push(`⚠️ ${newMedName} may interact with ${existingMed.name}`);
            }
          });
        }
      });
    });
    
    return warnings;
  }

  // Check for low stock medications
  checkLowStock() {
    this.medications.forEach(med => {
      if (med.trackInventory && med.pillsRemaining !== undefined) {
        if (med.pillsRemaining <= (med.lowStockThreshold || 5) && med.pillsRemaining > 0) {
          console.log(`Low stock: ${med.name} - ${med.pillsRemaining} pills remaining`);
        }
      }
    });
  }

  // Toggle theme
  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    this.applyTheme();
    this.saveToStorage();
  }

  // Apply theme
  applyTheme() {
    document.body.setAttribute('data-theme', this.theme);
  }

  // Check if we need to perform daily reset and update streak
  checkDailyReset() {
    const today = new Date().toDateString();
    
    // First time opening or new day
    if (this.lastOpenedDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();
      
      // Only check streak if we have medications and this isn't first run
      if (this.lastOpenedDate && this.medications.length > 0) {
        // Check if all medications from yesterday were taken
        const yesterdayAdherence = this.calculateDayAdherence(yesterdayStr);
        
        if (yesterdayAdherence === 100) {
          // Perfect adherence - increment streak
          this.streak++;
        } else if (this.lastOpenedDate === yesterdayStr) {
          // Opened yesterday but didn't complete - reset streak
          this.streak = 0;
        } else {
          // Missed a day - reset streak
          this.streak = 0;
        }
      }
      
      // Update last opened date
      this.lastOpenedDate = today;
      this.saveToStorage();
    }
    
    // Check today's adherence for current streak status
    const todayAdherence = this.calculateDayAdherence(new Date().toDateString());
    if (todayAdherence === 100 && this.medications.length > 0) {
      // Today is complete, show current streak + 1 (pending)
      this.pendingStreakDay = true;
    } else {
      this.pendingStreakDay = false;
    }
  }

  // Calculate adherence percentage for a specific day
  calculateDayAdherence(dateString) {
    if (this.medications.length === 0) return 0;
    
    // Count how many medications should have been taken that day
    const medsForDay = this.medications.length;
    
    // Count how many were actually taken
    const takenCount = this.history.filter(entry => {
      const entryDate = new Date(entry.takenAt);
      return entryDate.toDateString() === dateString;
    }).length;
    
    return medsForDay > 0 ? Math.round((takenCount / medsForDay) * 100) : 0;
  }

  // Check and request notification permission
  async checkNotificationPermission() {
    if (!('Notification' in window)) {
      console.log('Browser does not support notifications');
      return;
    }
    
    this.notificationPermission = Notification.permission;
    this.updateNotificationButton();
  }

  // Request notification permission
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      this.showToast('Browser does not support notifications');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      this.notificationPermission = permission;
      this.updateNotificationButton();
      
      if (permission === 'granted') {
        this.showToast('Notifications enabled! You\'ll get alerts even in background');
        // Test notification
        this.sendNotification('MediTrack', 'Notifications are now enabled!', '💊');
      } else {
        this.showToast('Notification permission denied');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  }

  // Update notification button UI
  updateNotificationButton() {
    const btn = document.getElementById('notifyBtn');
    const label = document.getElementById('notifyLabel');
    
    if (!btn) return;
    
    if (this.notificationPermission === 'granted') {
      btn.classList.add('granted');
      if (label) label.textContent = 'Reminders enabled';
    } else {
      btn.classList.remove('granted');
      if (label) label.textContent = 'Enable reminders';
    }
  }

  // Send browser notification
  sendNotification(title, body, icon = '💊') {
    if (this.notificationPermission !== 'granted') return;
    
    try {
      const notification = new Notification(title, {
        body: body,
        icon: icon,
        badge: icon,
        tag: 'meditrack-reminder',
        requireInteraction: true,
        silent: false
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  // Start the smart scheduler
  startScheduler() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
    }
    
    this.schedulerInterval = setInterval(() => {
      this.checkAlarms();
      this.updateNextDoseCountdown();
    }, 1000);
  }

  // Check if any medications need to trigger an alarm
  checkAlarms() {
    const now = new Date();
    const currentTime = this.formatTime(now);
    const today = now.toDateString();
    
    this.medications.forEach(med => {
      const times = med.times || [med.time];
      
      times.forEach(time => {
        if (currentTime === time) {
          // Check if medication was already taken at this time today
          const takenAtThisTime = this.history.some(entry => {
            const entryDate = new Date(entry.takenAt);
            const entryTime = this.formatTime(entryDate);
            return entry.medicationId === med.id && 
                   entryDate.toDateString() === today &&
                   entryTime === time;
          });
          
          if (!takenAtThisTime) {
            this.triggerAlarm(med, time);
            // Send browser notification
            this.sendNotification(
              `Time to take ${med.name}`,
              `${med.dosage || 'Medication'} - ${med.notes || 'Take as prescribed'}`,
              '💊'
            );
          }
        }
      });
    });
  }

  // Trigger alarm overlay
  triggerAlarm(medication) {
    const overlay = document.getElementById('alarm-overlay');
    if (overlay) {
      overlay.classList.add('active');
      overlay.dataset.medicationId = medication.id;
      
      // Update overlay content
      const medName = overlay.querySelector('.med-name');
      const medDosage = overlay.querySelector('.med-dosage');
      
      if (medName) medName.textContent = medication.name;
      if (medDosage) medDosage.textContent = medication.dosage;
    }
    
    // Play alarm sound if available
    this.playAlarmSound();
  }

  // Play alarm sound
  playAlarmSound() {
    const audio = document.getElementById('alarm-sound');
    if (audio) {
      audio.play().catch(err => console.log('Audio play failed:', err));
    }
  }

  // Update next dose countdown
  updateNextDoseCountdown() {
    const nextDose = this.getNextDose();
    const countdownElement = document.getElementById('next-dose-countdown');
    
    if (nextDose && countdownElement) {
      const timeUntil = this.calculateTimeUntil(nextDose.time);
      countdownElement.textContent = timeUntil;
      
      // Update medication name
      const nextMedName = document.getElementById('next-med-name');
      if (nextMedName) {
        nextMedName.textContent = nextDose.name;
      }
    } else if (countdownElement) {
      countdownElement.textContent = 'No upcoming doses';
    }
  }

  // Get the next upcoming medication
  getNextDose() {
    if (this.medications.length === 0) return null;
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    let nearest = null;
    let smallestDiff = Infinity;
    
    this.medications.forEach(med => {
      const times = med.times || [med.time];
      
      times.forEach(time => {
        const [hours, minutes] = time.split(':').map(Number);
        const medMinutes = hours * 60 + minutes;
        
        // Calculate difference (handle wrap-around for next day)
        let diff = medMinutes - currentMinutes;
        if (diff < 0) {
          diff += 24 * 60; // Add 24 hours if time has passed today
        }
        
        if (diff < smallestDiff) {
          smallestDiff = diff;
          nearest = { ...med, nextTime: time };
        }
      });
    });
    
    return nearest;
  }

  // Calculate time until next dose
  calculateTimeUntil(targetTime) {
    const now = new Date();
    const [hours, minutes] = targetTime.split(':').map(Number);
    
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);
    
    // If target time has passed today, set it for tomorrow
    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }
    
    const diff = target - now;
    const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
    const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secondsLeft = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (hoursLeft > 0) {
      return `${hoursLeft}h ${minutesLeft}m`;
    } else if (minutesLeft > 0) {
      return `${minutesLeft}m ${secondsLeft}s`;
    } else {
      return `${secondsLeft}s`;
    }
  }

  // Format time as HH:MM
  formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  // Load data from localStorage
  loadFromStorage() {
    const savedMeds = localStorage.getItem('medications');
    const savedHistory = localStorage.getItem('medicationHistory');
    const savedStreak = localStorage.getItem('streak');
    const savedLastOpened = localStorage.getItem('lastOpenedDate');
    const savedTheme = localStorage.getItem('theme');
    
    if (savedMeds) {
      this.medications = JSON.parse(savedMeds);
    }
    
    if (savedHistory) {
      this.history = JSON.parse(savedHistory);
    }
    
    if (savedStreak) {
      this.streak = parseInt(savedStreak);
    }
    
    if (savedLastOpened) {
      this.lastOpenedDate = savedLastOpened;
    }
    
    if (savedTheme) {
      this.theme = savedTheme;
      this.applyTheme();
    }
  }

  // Save data to localStorage
  saveToStorage() {
    localStorage.setItem('medications', JSON.stringify(this.medications));
    localStorage.setItem('medicationHistory', JSON.stringify(this.history));
    localStorage.setItem('streak', this.streak.toString());
    localStorage.setItem('lastOpenedDate', this.lastOpenedDate);
    localStorage.setItem('theme', this.theme);
  }

  // Add new medication
  addMedication(name, dosage, frequency, time) {
    const medication = {
      id: Date.now(),
      name,
      dosage,
      frequency,
      time,
      createdAt: new Date().toISOString()
    };
    
    this.medications.push(medication);
    this.saveToStorage();
    this.render();
  }

  // Remove medication
  removeMedication(id) {
    const med = this.medications.find(m => m.id === id);
    if (med) {
      this.deletedItems.push({ type: 'medication', data: med, timestamp: Date.now() });
    }
    this.medications = this.medications.filter(med => med.id !== id);
    this.saveToStorage();
    this.render();
    this.showToastWithUndo(`${med?.name || 'Medication'} deleted`, () => this.undoDelete());
  }

  // Undo delete
  undoDelete() {
    if (this.deletedItems.length === 0) return;
    
    const lastDeleted = this.deletedItems.pop();
    
    if (lastDeleted.type === 'medication') {
      this.medications.push(lastDeleted.data);
      this.saveToStorage();
      this.render();
      this.showToast('Medication restored');
    }
  }

  // Edit medication
  editMedication(id) {
    const med = this.medications.find(m => m.id === id);
    if (!med) return;
    
    // Populate modal with existing data
    document.getElementById('medName').value = med.name || '';
    document.getElementById('medDose').value = med.dosage || '';
    document.getElementById('medNotes').value = med.notes || '';
    document.getElementById('medWithFood').checked = med.withFood || false;
    document.getElementById('trackInventory').checked = med.trackInventory || false;
    document.getElementById('pillsRemaining').value = med.pillsRemaining || '';
    document.getElementById('lowStockThreshold').value = med.lowStockThreshold || 5;
    document.getElementById('doctorInfo').value = med.doctorInfo || '';
    document.getElementById('prescriptionNumber').value = med.prescriptionNumber || '';
    
    // Show inventory fields if tracking
    if (med.trackInventory) {
      document.getElementById('inventoryFields').style.display = 'block';
    }
    
    // Set photo if exists
    if (med.photo) {
      const preview = document.getElementById('photoPreview');
      preview.innerHTML = `<img src="${med.photo}" alt="Medication photo" />`;
      preview.classList.add('has-image');
    }
    
    // Set times
    const timesContainer = document.getElementById('timesContainer');
    const times = med.times || [med.time];
    timesContainer.innerHTML = times.map((time, index) => `
      <div class="time-input-row">
        <input type="time" class="dose-time" value="${time}" />
        <button type="button" class="remove-time-btn" style="display:${times.length > 1 ? 'block' : 'none'};">✕</button>
      </div>
    `).join('');
    
    // Attach remove button listeners
    timesContainer.querySelectorAll('.remove-time-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.target.closest('.time-input-row').remove();
        this.updateRemoveButtons();
      });
    });
    
    // Set color
    const colorSwatches = document.querySelectorAll('.color-swatch');
    colorSwatches.forEach(swatch => {
      swatch.classList.toggle('active', swatch.dataset.color === med.color);
    });
    
    // Set frequency
    const freqBtns = document.querySelectorAll('.freq-btn');
    freqBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.freq === med.frequency);
    });
    
    // Store editing ID
    document.getElementById('modal').dataset.editingId = id;
    
    // Open modal
    document.getElementById('modalOverlay').classList.add('open');
    document.querySelector('.modal-title').textContent = 'Edit Medication';
  }

  // Handle taking medication with food reminder
  handleTakeMedication(medicationId, skipPrompt = false) {
    const medication = this.medications.find(med => med.id === medicationId);
    
    if (!medication) return;
    
    // Show food reminder if needed
    if (!skipPrompt && medication.withFood) {
      const shouldTake = confirm(
        `🍽️ Reminder: ${medication.name} should be taken with food.\n\n` +
        `Have you eaten recently?\n\n` +
        `Click OK if you've eaten, or Cancel to be reminded later.`
      );
      
      if (!shouldTake) {
        this.showToast('Reminder: Eat something before taking ' + medication.name);
        return;
      }
    }
    
    this.logMedication(medicationId);
    
    // Update inventory if tracked
    if (medication.trackInventory && medication.pillsRemaining > 0) {
      medication.pillsRemaining--;
      this.saveToStorage();
      
      // Check for low stock
      if (medication.pillsRemaining <= (medication.lowStockThreshold || 5)) {
        if (medication.pillsRemaining === 0) {
          this.showToast(`⚠️ ${medication.name} is out of stock! Time to refill.`);
        } else {
          this.showToast(`⚠️ Low stock: ${medication.pillsRemaining} pills of ${medication.name} remaining`);
        }
      }
      
      this.render();
    }
  }

  // Skip dose with reason
  skipDose(medicationId, reason = 'No reason provided') {
    const medication = this.medications.find(med => med.id === medicationId);
    
    if (medication) {
      const skipEntry = {
        id: Date.now(),
        medicationId,
        medicationName: medication.name,
        skipped: true,
        reason: reason,
        skippedAt: new Date().toISOString()
      };
      
      this.history.push(skipEntry);
      this.saveToStorage();
      this.render();
      this.showToast(`Skipped: ${medication.name}`);
    }
  }

  // Postpone dose
  postponeDose(medicationId, minutes = 30) {
    const medication = this.medications.find(med => med.id === medicationId);
    
    if (medication) {
      setTimeout(() => {
        this.triggerAlarm(medication);
      }, minutes * 60 * 1000);
      
      this.showToast(`${medication.name} postponed for ${minutes} minutes`);
    }
  }

  // Log medication taken
  logMedication(medicationId) {
    const medication = this.medications.find(med => med.id === medicationId);
    
    if (medication) {
      const logEntry = {
        id: Date.now(),
        medicationId,
        medicationName: medication.name,
        dosage: medication.dosage,
        takenAt: new Date().toISOString()
      };
      
      this.history.push(logEntry);
      
      // Check if this completes today's adherence
      const todayAdherence = this.calculateDayAdherence(new Date().toDateString());
      if (todayAdherence === 100) {
        this.pendingStreakDay = true;
        this.showToast('🔥 Perfect adherence today! Keep your streak going!');
      } else {
        this.showToast('✓ Dose logged');
      }
      
      this.saveToStorage();
      this.render();
    }
  }

  // Get medication history
  getHistory(limit = null) {
    const sorted = [...this.history].sort((a, b) => 
      new Date(b.takenAt) - new Date(a.takenAt)
    );
    
    return limit ? sorted.slice(0, limit) : sorted;
  }

  // Clear all data
  clearAllData() {
    this.medications = [];
    this.history = [];
    this.streak = 0;
    this.lastOpenedDate = null;
    localStorage.removeItem('medications');
    localStorage.removeItem('medicationHistory');
    localStorage.removeItem('streak');
    localStorage.removeItem('lastOpenedDate');
    this.render();
  }

  // Show toast with undo button
  showToastWithUndo(message, undoCallback) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.innerHTML = `
      <span>${message}</span>
      <button class="undo-btn" style="margin-left: 12px; background: var(--accent); color: #080b12; border: none; padding: 4px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px;">Undo</button>
    `;
    
    toast.classList.add('show');
    
    const undoBtn = toast.querySelector('.undo-btn');
    if (undoBtn) {
      undoBtn.onclick = () => {
        undoCallback();
        toast.classList.remove('show');
      };
    }
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 5000);
  }

  // Show simple toast
  showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  // Attach event listeners
  attachEventListeners() {
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    // Export data
    const exportBtn = document.getElementById('exportData');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportData());
    }

    // Notification permission button
    const notifyBtn = document.getElementById('notifyBtn');
    if (notifyBtn) {
      notifyBtn.addEventListener('click', () => this.requestNotificationPermission());
    }

    // Modal controls
    const openModal = document.getElementById('openModal');
    const closeModal = document.getElementById('closeModal');
    const modalOverlay = document.getElementById('modalOverlay');
    const saveMed = document.getElementById('saveMed');

    if (openModal) {
      openModal.addEventListener('click', () => {
        // Clear editing state
        delete document.getElementById('modal').dataset.editingId;
        document.querySelector('.modal-title').textContent = 'Add Medication';
        this.clearModalForm();
        modalOverlay.classList.add('open');
      });
    }

    if (closeModal) {
      closeModal.addEventListener('click', () => {
        modalOverlay.classList.remove('open');
        this.clearModalForm();
      });
    }

    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
          modalOverlay.classList.remove('open');
          this.clearModalForm();
        }
      });
    }

    if (saveMed) {
      saveMed.addEventListener('click', () => this.handleSaveMedication());
    }

    // Track inventory checkbox
    const trackInventory = document.getElementById('trackInventory');
    const inventoryFields = document.getElementById('inventoryFields');
    if (trackInventory && inventoryFields) {
      trackInventory.addEventListener('change', (e) => {
        inventoryFields.style.display = e.target.checked ? 'block' : 'none';
      });
    }

    // Add time button
    const addTimeBtn = document.getElementById('addTimeBtn');
    if (addTimeBtn) {
      addTimeBtn.addEventListener('click', () => this.addTimeInput());
    }

    // Photo upload
    const medPhoto = document.getElementById('medPhoto');
    if (medPhoto) {
      medPhoto.addEventListener('change', (e) => this.handlePhotoUpload(e));
    }

    // Color picker
    const colorSwatches = document.querySelectorAll('.color-swatch');
    colorSwatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        colorSwatches.forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
      });
    });

    // Frequency picker
    const freqBtns = document.querySelectorAll('.freq-btn');
    freqBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        freqBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Test alarm
    const testAlarm = document.getElementById('testAlarm');
    if (testAlarm) {
      testAlarm.addEventListener('click', () => {
        this.triggerAlarm({
          id: 'test',
          name: 'Test Medication',
          dosage: '500mg',
          notes: 'This is a test alarm',
          time: this.formatTime(new Date()),
          times: [this.formatTime(new Date())]
        });
      });
    }

    // Alarm controls
    const alarmTake = document.getElementById('alarmTake');
    const alarmSnooze = document.getElementById('alarmSnooze');
    const alarmDismiss = document.getElementById('alarmDismiss');

    if (alarmTake) {
      alarmTake.addEventListener('click', () => this.handleAlarmTake());
    }

    if (alarmSnooze) {
      alarmSnooze.addEventListener('click', () => this.handleAlarmSnooze());
    }

    if (alarmDismiss) {
      alarmDismiss.addEventListener('click', () => this.handleAlarmDismiss());
    }

    // Clear log
    const clearLog = document.getElementById('clearLog');
    if (clearLog) {
      clearLog.addEventListener('click', () => {
        if (confirm('Clear all dose history? This will reset your streak.')) {
          this.history = [];
          this.streak = 0;
          this.saveToStorage();
          this.render();
        }
      });
    }
  }

  // Add time input field
  addTimeInput() {
    const container = document.getElementById('timesContainer');
    const timeRow = document.createElement('div');
    timeRow.className = 'time-input-row';
    timeRow.innerHTML = `
      <input type="time" class="dose-time" value="12:00" />
      <button type="button" class="remove-time-btn">✕</button>
    `;
    
    const removeBtn = timeRow.querySelector('.remove-time-btn');
    removeBtn.addEventListener('click', () => {
      timeRow.remove();
      this.updateRemoveButtons();
    });
    
    container.appendChild(timeRow);
    this.updateRemoveButtons();
  }

  // Update visibility of remove buttons
  updateRemoveButtons() {
    const timeRows = document.querySelectorAll('.time-input-row');
    timeRows.forEach((row, index) => {
      const removeBtn = row.querySelector('.remove-time-btn');
      if (removeBtn) {
        removeBtn.style.display = timeRows.length > 1 ? 'block' : 'none';
      }
    });
  }

  // Handle photo upload
  handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.getElementById('photoPreview');
      preview.innerHTML = `<img src="${e.target.result}" alt="Medication photo" />`;
      preview.classList.add('has-image');
    };
    reader.readAsDataURL(file);
  }

  // Export data
  exportData() {
    const data = {
      medications: this.medications,
      history: this.history,
      streak: this.streak,
      exportDate: new Date().toISOString()
    };
    
    // Create downloadable JSON
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `meditrack-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    
    // Also generate PDF report
    this.generatePDFReport();
  }

  // Generate PDF report (simplified HTML version)
  generatePDFReport() {
    const reportWindow = window.open('', '_blank');
    const adherence = this.calculateDayAdherence(new Date().toDateString());
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>MediTrack Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { color: #d946ef; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #f5f5f5; font-weight: bold; }
          .stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin: 30px 0; }
          .stat-box { padding: 20px; background: #f9f9f9; border-radius: 8px; text-align: center; }
          .stat-num { font-size: 32px; font-weight: bold; color: #d946ef; }
          .stat-label { color: #666; margin-top: 8px; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <h1>📊 MediTrack Report</h1>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        
        <div class="stats">
          <div class="stat-box">
            <div class="stat-num">${this.medications.length}</div>
            <div class="stat-label">Active Medications</div>
          </div>
          <div class="stat-box">
            <div class="stat-num">${this.streak}</div>
            <div class="stat-label">Day Streak</div>
          </div>
          <div class="stat-box">
            <div class="stat-num">${adherence}%</div>
            <div class="stat-label">Today's Adherence</div>
          </div>
        </div>
        
        <h2>Current Medications</h2>
        <table>
          <thead>
            <tr>
              <th>Medication</th>
              <th>Dosage</th>
              <th>Times</th>
              <th>Notes</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            ${this.medications.map(med => `
              <tr>
                <td><strong>${med.name}</strong></td>
                <td>${med.dosage || '-'}</td>
                <td>${(med.times || [med.time]).join(', ')}</td>
                <td>${med.notes || '-'}</td>
                <td>${med.trackInventory ? `${med.pillsRemaining || 0} pills` : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <h2>Recent History (Last 30 doses)</h2>
        <table>
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Medication</th>
              <th>Dosage</th>
            </tr>
          </thead>
          <tbody>
            ${this.getHistory(30).map(entry => `
              <tr>
                <td>${new Date(entry.takenAt).toLocaleString()}</td>
                <td>${entry.medicationName}</td>
                <td>${entry.dosage || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <button onclick="window.print()" style="padding: 12px 24px; background: #d946ef; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; margin-top: 20px;">Print Report</button>
      </body>
      </html>
    `;
    
    reportWindow.document.write(html);
    reportWindow.document.close();
    
    this.showToast('Report generated! Check the new window.');
  }

  // Get history for a specific date
  getHistoryForDate(dateString) {
    return this.history.filter(entry => {
      const entryDate = new Date(entry.takenAt);
      return entryDate.toDateString() === dateString;
    });
  }

  // Clear modal form
  clearModalForm() {
    document.getElementById('medName').value = '';
    document.getElementById('medDose').value = '';
    document.getElementById('medNotes').value = '';
    document.getElementById('medWithFood').checked = false;
    document.getElementById('trackInventory').checked = false;
    document.getElementById('pillsRemaining').value = '';
    document.getElementById('lowStockThreshold').value = '5';
    document.getElementById('doctorInfo').value = '';
    document.getElementById('prescriptionNumber').value = '';
    document.getElementById('medPhoto').value = '';
    document.getElementById('photoPreview').innerHTML = '';
    document.getElementById('photoPreview').classList.remove('has-image');
    document.getElementById('inventoryFields').style.display = 'none';
    
    // Reset time inputs
    const timesContainer = document.getElementById('timesContainer');
    timesContainer.innerHTML = `
      <div class="time-input-row">
        <input type="time" class="dose-time" value="08:00" />
        <button type="button" class="remove-time-btn" style="display:none;">✕</button>
      </div>
    `;
    
    const colorSwatches = document.querySelectorAll('.color-swatch');
    colorSwatches.forEach((s, i) => s.classList.toggle('active', i === 0));
    
    const freqBtns = document.querySelectorAll('.freq-btn');
    freqBtns.forEach((b, i) => b.classList.toggle('active', i === 0));
  }

  // Handle save medication
  handleSaveMedication() {
    const name = document.getElementById('medName').value.trim();
    const dosage = document.getElementById('medDose').value.trim();
    const notes = document.getElementById('medNotes').value.trim();
    const withFood = document.getElementById('medWithFood').checked;
    const trackInventory = document.getElementById('trackInventory').checked;
    const pillsRemaining = parseInt(document.getElementById('pillsRemaining').value) || 0;
    const lowStockThreshold = parseInt(document.getElementById('lowStockThreshold').value) || 5;
    const doctorInfo = document.getElementById('doctorInfo').value.trim();
    const prescriptionNumber = document.getElementById('prescriptionNumber').value.trim();
    const color = document.querySelector('.color-swatch.active')?.dataset.color || '#00d4a0';
    const frequency = document.querySelector('.freq-btn.active')?.dataset.freq || 'daily';
    
    // Get all times
    const timeInputs = document.querySelectorAll('.dose-time');
    const times = Array.from(timeInputs).map(input => input.value).filter(t => t);
    
    // Get photo if uploaded
    const photoPreview = document.getElementById('photoPreview');
    const photo = photoPreview.querySelector('img')?.src || null;

    if (!name) {
      this.showToast('Please enter medication name');
      return;
    }

    if (times.length === 0) {
      this.showToast('Please add at least one reminder time');
      return;
    }

    const editingId = document.getElementById('modal').dataset.editingId;
    
    if (editingId) {
      // Update existing medication
      const med = this.medications.find(m => m.id === parseInt(editingId));
      if (med) {
        med.name = name;
        med.dosage = dosage;
        med.times = times;
        med.time = times[0]; // Keep for backward compatibility
        med.notes = notes;
        med.withFood = withFood;
        med.trackInventory = trackInventory;
        med.pillsRemaining = trackInventory ? pillsRemaining : undefined;
        med.lowStockThreshold = trackInventory ? lowStockThreshold : undefined;
        med.doctorInfo = doctorInfo;
        med.prescriptionNumber = prescriptionNumber;
        med.photo = photo;
        med.color = color;
        med.frequency = frequency;
        this.showToast('Medication updated');
      }
    } else {
      // Check for interactions
      const warnings = this.checkInteractions(name);
      if (warnings.length > 0) {
        const proceed = confirm(
          warnings.join('\n') + '\n\nDo you want to add this medication anyway?'
        );
        if (!proceed) return;
      }
      
      // Add new medication
      this.medications.push({
        id: Date.now(),
        name,
        dosage,
        times,
        time: times[0], // Keep for backward compatibility
        notes,
        withFood,
        trackInventory,
        pillsRemaining: trackInventory ? pillsRemaining : undefined,
        lowStockThreshold: trackInventory ? lowStockThreshold : undefined,
        doctorInfo,
        prescriptionNumber,
        photo,
        color,
        frequency,
        createdAt: new Date().toISOString()
      });
      this.showToast('Medication added');
    }

    this.saveToStorage();
    this.render();
    document.getElementById('modalOverlay').classList.remove('open');
    this.clearModalForm();
  }

  // Handle alarm actions
  handleAlarmTake() {
    const overlay = document.getElementById('alarmOverlay');
    const medId = overlay?.dataset.medicationId;
    
    if (medId && medId !== 'test') {
      const medication = this.medications.find(m => m.id === parseInt(medId));
      
      // Check if medication requires food
      if (medication?.withFood) {
        const hasEaten = confirm(
          `🍽️ Reminder: ${medication.name} should be taken with food.\n\n` +
          `Have you eaten recently?\n\n` +
          `Click OK if you've eaten, or Cancel to snooze.`
        );
        
        if (!hasEaten) {
          overlay?.classList.remove('ringing');
          this.showToast('Snoozed - Remember to eat first!');
          // Auto-snooze for 10 minutes
          setTimeout(() => {
            if (medication) this.triggerAlarm(medication);
          }, 10 * 60 * 1000);
          return;
        }
      }
      
      this.handleTakeMedication(parseInt(medId), true);
      this.showToast('Dose logged successfully');
    }
    
    overlay?.classList.remove('ringing');
  }

  handleAlarmSnooze() {
    const overlay = document.getElementById('alarmOverlay');
    overlay?.classList.remove('ringing');
    this.showToast('Snoozed for 10 minutes');
    
    // Re-trigger after 10 minutes
    const medId = overlay?.dataset.medicationId;
    if (medId && medId !== 'test') {
      setTimeout(() => {
        const med = this.medications.find(m => m.id === parseInt(medId));
        if (med) this.triggerAlarm(med);
      }, 10 * 60 * 1000);
    }
  }

  handleAlarmDismiss() {
    const overlay = document.getElementById('alarmOverlay');
    overlay?.classList.remove('ringing');
  }

  // Trigger alarm overlay
  triggerAlarm(medication, specificTime = null) {
    const overlay = document.getElementById('alarmOverlay');
    if (!overlay) return;
    
    overlay.classList.add('ringing');
    overlay.dataset.medicationId = medication.id;
    if (specificTime) overlay.dataset.specificTime = specificTime;
    
    // Update content
    const medName = document.getElementById('alarmMedName');
    const medDetail = document.getElementById('alarmMedDetail');
    const alarmTime = document.getElementById('alarmTime');
    const iconWrap = document.getElementById('alarmIconWrap');
    
    if (medName) medName.textContent = medication.name;
    
    // Build detail text with food reminder and inventory
    let detailText = medication.dosage || '';
    if (medication.withFood) {
      detailText += (detailText ? ' · ' : '') + '🍽️ Take with food';
    }
    if (medication.trackInventory && medication.pillsRemaining !== undefined) {
      detailText += (detailText ? ' · ' : '') + `📦 ${medication.pillsRemaining} pills left`;
    }
    if (medication.notes) {
      detailText += (detailText ? ' · ' : '') + medication.notes;
    }
    
    if (medDetail) medDetail.textContent = detailText;
    if (alarmTime) alarmTime.textContent = specificTime || medication.time || medication.times[0];
    if (iconWrap && medication.color) {
      iconWrap.style.borderColor = medication.color;
      iconWrap.style.background = `color-mix(in srgb, ${medication.color} 15%, transparent)`;
    }
  }

  // Render UI
  render() {
    this.renderMedications();
    this.renderStats();
    this.renderCalendar();
    this.renderLog();
    this.updateNextDoseCountdown();
  }

  // Render medications list
  renderMedications() {
    const medList = document.getElementById('medList');
    const emptyState = document.getElementById('emptyState');
    
    if (!medList) return;
    
    if (this.medications.length === 0) {
      medList.innerHTML = '';
      if (emptyState) emptyState.classList.add('visible');
      return;
    }
    
    if (emptyState) emptyState.classList.remove('visible');
    
    const now = new Date();
    const today = now.toDateString();
    
    // Create a card for each medication time
    const medCards = [];
    
    this.medications.forEach(med => {
      const times = med.times || [med.time];
      
      times.forEach(time => {
        const takenAtThisTime = this.history.some(entry => {
          const entryDate = new Date(entry.takenAt);
          const entryTime = this.formatTime(entryDate);
          return entry.medicationId === med.id && 
                 entryDate.toDateString() === today &&
                 entryTime === time;
        });
        
        const [hours, minutes] = time.split(':');
        const medTime = new Date();
        medTime.setHours(parseInt(hours), parseInt(minutes), 0);
        const isOverdue = !takenAtThisTime && medTime < now;
        
        // Check low stock
        const lowStock = med.trackInventory && 
                        med.pillsRemaining !== undefined && 
                        med.pillsRemaining <= (med.lowStockThreshold || 5);
        
        medCards.push({
          time,
          html: `
            <div class="med-card ${takenAtThisTime ? 'taken' : ''} ${isOverdue ? 'overdue' : ''}" style="--med-color: ${med.color}">
              <div class="med-icon">${this.getMedIcon(med.name)}</div>
              <div class="med-info">
                <div class="med-name">
                  ${med.name}
                  ${med.withFood ? '<span class="food-badge" title="Take with food">🍽️</span>' : ''}
                  ${lowStock ? `<span class="low-stock-badge">${med.pillsRemaining || 0} left</span>` : ''}
                </div>
                <div class="med-meta">
                  ${med.dosage ? `<span class="med-dose">${med.dosage}</span>` : ''}
                  ${med.notes ? `<span class="med-notes">${med.notes}</span>` : ''}
                </div>
                ${med.trackInventory ? `<div class="inventory-info">📦 ${med.pillsRemaining || 0} pills remaining</div>` : ''}
              </div>
              <div class="med-time">${time}</div>
              <div class="med-actions">
                <button class="take-btn ${takenAtThisTime ? 'done' : 'pending'}" 
                        onclick="app.${takenAtThisTime ? '' : `handleTakeMedication(${med.id})`}" 
                        ${takenAtThisTime ? 'disabled' : ''}
                        aria-label="${takenAtThisTime ? 'Already taken' : 'Mark as taken'}">
                  ${takenAtThisTime ? '✓ Taken' : 'Take'}
                </button>
                ${!takenAtThisTime ? `
                  <button class="delete-btn" onclick="app.showSkipMenu(${med.id})" 
                          title="Skip or postpone" aria-label="Skip ${med.name}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                ` : ''}
                <button class="delete-btn" onclick="app.editMedication(${med.id})" 
                        title="Edit medication" aria-label="Edit ${med.name}">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
                ${times.length === 1 ? `
                  <button class="delete-btn" onclick="app.removeMedication(${med.id})" 
                          title="Delete medication" aria-label="Delete ${med.name}">✕</button>
                ` : ''}
              </div>
            </div>
          `
        });
      });
    });
    
    // Sort by time
    medCards.sort((a, b) => a.time.localeCompare(b.time));
    medList.innerHTML = medCards.map(card => card.html).join('');
  }

  // Show skip/postpone menu
  showSkipMenu(medicationId) {
    const med = this.medications.find(m => m.id === medicationId);
    if (!med) return;
    
    const choice = prompt(
      `Options for ${med.name}:\n\n` +
      `1 - Skip this dose\n` +
      `2 - Postpone 30 minutes\n` +
      `3 - Postpone 1 hour\n` +
      `4 - Cancel\n\n` +
      `Enter your choice (1-4):`
    );
    
    switch(choice) {
      case '1':
        const reason = prompt('Reason for skipping (optional):') || 'No reason provided';
        this.skipDose(medicationId, reason);
        break;
      case '2':
        this.postponeDose(medicationId, 30);
        break;
      case '3':
        this.postponeDose(medicationId, 60);
        break;
      default:
        break;
    }
  }

  // Get medication icon
  getMedIcon(name) {
    const lower = name.toLowerCase();
    if (lower.includes('vitamin')) return '🌟';
    if (lower.includes('pain') || lower.includes('aspirin')) return '💊';
    if (lower.includes('antibiotic')) return '💉';
    if (lower.includes('insulin')) return '💉';
    return '💊';
  }

  // Render stats
  renderStats() {
    const now = new Date();
    const today = now.toDateString();
    
    // Calculate today's adherence
    const todayMeds = this.medications.length;
    const takenToday = this.history.filter(entry => {
      const entryDate = new Date(entry.takenAt);
      return entryDate.toDateString() === today;
    }).length;
    
    const adherencePct = todayMeds > 0 ? Math.round((takenToday / todayMeds) * 100) : 0;
    
    const adherenceRing = document.getElementById('adherenceRing');
    const adherencePctEl = document.getElementById('adherencePct');
    const adherenceText = document.getElementById('adherenceText');
    
    if (adherenceRing) {
      const circumference = 314;
      const offset = circumference - (adherencePct / 100) * circumference;
      adherenceRing.style.strokeDashoffset = offset;
    }
    
    if (adherencePctEl) adherencePctEl.textContent = `${adherencePct}%`;
    if (adherenceText) {
      adherenceText.textContent = todayMeds === 0 
        ? 'No medications scheduled today'
        : `${takenToday} of ${todayMeds} doses taken`;
    }
    
    // Update total meds
    const totalMeds = document.getElementById('totalMeds');
    const totalFill = document.getElementById('totalFill');
    
    if (totalMeds) totalMeds.textContent = this.medications.length;
    if (totalFill) totalFill.style.width = `${Math.min(100, this.medications.length * 10)}%`;
    
    // Update streak
    const streakNum = document.getElementById('streakNum');
    const streakSub = document.getElementById('streakSub');
    
    if (streakNum) {
      const displayStreak = this.pendingStreakDay ? this.streak + 1 : this.streak;
      streakNum.textContent = displayStreak;
    }
    
    if (streakSub) {
      if (this.streak === 0 && !this.pendingStreakDay) {
        streakSub.textContent = 'Complete today to start';
      } else if (this.pendingStreakDay) {
        streakSub.textContent = 'Keep it up tomorrow!';
      } else {
        streakSub.textContent = `${this.streak} day${this.streak !== 1 ? 's' : ''} strong`;
      }
    }
  }

  // Render calendar
  renderCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    if (!calendarGrid) return;
    
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date);
    }
    
    const today = new Date();
    
    calendarGrid.innerHTML = days.map(date => {
      const dateStr = date.toDateString();
      const isToday = dateStr === today.toDateString();
      const isFuture = date > today;
      
      // Calculate adherence for this day
      let dayClass = '';
      if (!isFuture && this.medications.length > 0) {
        const adherence = this.calculateDayAdherence(dateStr);
        if (adherence === 100) {
          dayClass = 'perfect';
        } else if (adherence > 0) {
          dayClass = 'partial';
        } else if (adherence === 0) {
          dayClass = 'missed';
        }
      }
      
      return `
        <div class="cal-day" title="${date.toLocaleDateString('en', { month: 'short', day: 'numeric' })} - ${dayClass || 'no data'}">
          <div class="cal-dot ${isToday ? 'today' : ''} ${isFuture ? 'future' : ''} ${dayClass}">
            ${date.getDate()}
          </div>
          <div class="cal-label">${date.toLocaleDateString('en', { weekday: 'short' })}</div>
        </div>
      `;
    }).join('');
  }

  // Render log
  renderLog() {
    const logList = document.getElementById('logList');
    if (!logList) return;
    
    if (this.history.length === 0) {
      logList.innerHTML = '<div class="log-empty">No doses logged yet.</div>';
      return;
    }
    
    const recentHistory = this.getHistory(10);
    
    logList.innerHTML = recentHistory.map(entry => {
      const date = new Date(entry.takenAt);
      const med = this.medications.find(m => m.id === entry.medicationId);
      const color = med?.color || '#00d4a0';
      
      return `
        <div class="log-entry">
          <div class="log-dot" style="background: ${color}"></div>
          <div class="log-time">${date.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}</div>
          <div class="log-text">
            <strong>${entry.medicationName}</strong> ${entry.dosage ? `(${entry.dosage})` : ''}
          </div>
        </div>
      `;
    }).join('');
  }
}

// Initialize app when DOM is ready
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new MedicationApp();
  
  // Update today's date
  const todayDate = document.getElementById('todayDate');
  if (todayDate) {
    todayDate.textContent = new Date().toLocaleString('en', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
  }
});
