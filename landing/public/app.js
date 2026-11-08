/**
 * Ethos Landing Page — Interactive Scripts & Waitlist API Client
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. INTERACTIVE MOCKUP TABS
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');

      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetContent = document.getElementById(`tab-${targetId}`);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
  });

  // 2. FAQ ACCORDION
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      // Fecha outros itens
      faqItems.forEach(i => i.classList.remove('open'));
      if (!isOpen) {
        item.classList.add('open');
      }
    });
  });

  // 3. WAITLIST FORM SUBMISSION
  const waitlistForm = document.getElementById('waitlist-form');
  const alertBox = document.getElementById('form-alert');
  const submitBtn = document.getElementById('submit-btn');
  const queueCounter = document.getElementById('hero-queue-count');

  // Atualizar contador de vagas/inscritos via API
  async function loadCommunityCount() {
    try {
      const res = await fetch('/api/waitlist');
      if (res.ok) {
        const data = await res.json();
        if (data && data.communityPioneers && queueCounter) {
          queueCounter.textContent = `${data.communityPioneers} pessoas na fila VIP`;
        }
      }
    } catch (_e) {
      // Ignora erro em preview estático
    }
  }
  loadCommunityCount();

  if (waitlistForm) {
    waitlistForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('name-input')?.value.trim();
      const email = document.getElementById('email-input')?.value.trim();
      const phone = document.getElementById('phone-input')?.value.trim();
      const interest = document.getElementById('interest-select')?.value;

      // Validação rápida
      if (!name || name.length < 2) {
        showAlert('Por favor, informe seu nome completo.', 'error');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        showAlert('Por favor, insira um endereço de e-mail válido.', 'error');
        return;
      }

      // Estado de Carregamento
      submitBtn.disabled = true;
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = `
        <svg class="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 0.8s linear infinite;">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
          <path d="M12 2a10 10 0 0 1 10 10"></path>
        </svg>
        <span>Garantindo Vaga...</span>
      `;

      try {
        const response = await fetch('/api/waitlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name,
            email,
            phone,
            interest
          })
        });

        const result = await response.json();

        if (response.ok && result.success) {
          const positionMsg = result.position ? `Você garantiu a posição #${result.position} na fila de prioridade.` : '';
          showAlert(`🎉 ${result.message} ${positionMsg}`, 'success');
          waitlistForm.reset();

          if (queueCounter) {
            queueCounter.textContent = `+150 pessoas na fila VIP`;
          }
        } else {
          showAlert(result.error || 'Ocorreu um erro ao processar. Tente novamente mais tarde.', 'error');
        }
      } catch (err) {
        console.error('Waitlist submit error:', err);
        showAlert('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }

  function showAlert(message, type) {
    if (!alertBox) return;
    alertBox.className = `alert-box ${type}`;
    alertBox.textContent = message;
    alertBox.style.display = 'block';

    if (type === 'success') {
      alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
});
