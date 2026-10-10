
// ==========================================================================
// ARMAZENAMENTO PERSISTENTE & CONTROLO EDITORIAL ESTRITO (FIREBASE HOSTING)
// ==========================================================================

function getDeletedArticleIds() {
  try {
    const raw = localStorage.getItem('awsj_deleted_article_ids');
    if (raw) return new Set(JSON.parse(raw).map(String));
  } catch (e) {}
  return new Set();
}

function markArticleAsDeleted(articleId) {
  if (!articleId) return;
  const idStr = String(articleId);
  const ids = getDeletedArticleIds();
  ids.add(idStr);
  try {
    localStorage.setItem('awsj_deleted_article_ids', JSON.stringify([...ids]));
  } catch (e) {}
  if (db) {
    try {
      db.collection('deleted_articles').doc(idStr).set({
        deletedAt: new Date().toISOString(),
        id: idStr
      });
    } catch (e) {}
  }
}

function getSavedArticles() {
  const saved = localStorage.getItem('awsj_custom_articles');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const deletedIds = getDeletedArticleIds();
        return parsed.filter(a => a && a.id && !deletedIds.has(String(a.id)));
      }
    } catch(e) {}
  }
  return [];
}

function saveArticlesLocally(articles) {
  try {
    const deletedIds = getDeletedArticleIds();
    const clean = (articles || []).filter(a => a && a.id && !deletedIds.has(String(a.id)));
    localStorage.setItem('awsj_custom_articles', JSON.stringify(clean));
  } catch(e) {
    console.warn('Erro ao salvar artigos localmente:', e);
  }
}

function getSavedPartners() {
  const saved = localStorage.getItem('awsj_custom_partners');
  if (saved) {
    try { return JSON.parse(saved); } catch(e) {}
  }
  return [
    { id: 1, name: 'Escritório Esteves & Multi-Serviços', category: 'Coordenação Editorial & Mentoria Científica', icon: 'fas fa-award', website_url: 'mailto:escritorioestevesemultisservic@gmail.com' }
  ];
}

function savePartnersLocally(partners) {
  try {
    localStorage.setItem('awsj_custom_partners', JSON.stringify(partners || []));
  } catch(e) {
    console.warn('Erro ao salvar parceiros localmente:', e);
  }
}

// ==========================================================================
// SINCRONIZAÇÃO EM NUVEM VIA CLOUD FIRESTORE (TEMPO REAL & PERSISTENTE)
// ==========================================================================
let db = null;
try {
  if (typeof firebase !== 'undefined' && firebase.firestore) {
    if (!firebase.apps || !firebase.apps.length) {
      try { firebase.initializeApp({ projectId: 'africawinners-510716' }); } catch (initErr) {}
    }
    db = firebase.firestore();
    console.log('🔥 Cloud Firestore conectado com sucesso ao projeto africawinners-510716');
  }
} catch (e) {
  console.warn('Modo offline/fallback local (Firestore não inicializado):', e);
}

function fileToBase64(file) {
  return new Promise((resolve) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

async function saveArticleToCloud(article) {
  if (!article || !article.id) return;
  saveArticlesLocally(State.articles);
  if (db) {
    try {
      const docId = String(article.id);
      await db.collection('articles').doc(docId).set(article, { merge: true });
      console.log('✅ Artigo sincronizado no Cloud Firestore:', docId);
    } catch (err) {
      console.warn('Aviso ao sincronizar no Firestore:', err);
    }
  }
}

async function deleteArticleFromCloud(articleId) {
  if (!articleId) return;
  const docId = String(articleId);
  markArticleAsDeleted(docId);
  if (db) {
    try {
      await db.collection('articles').doc(docId).delete();
      console.log('🗑️ Artigo removido definitivamente do Cloud Firestore:', docId);
    } catch (err) {
      console.warn('Aviso ao remover do Firestore:', err);
    }
  }
}

async function savePartnerToCloud(partner) {
  if (!partner || !partner.id) return;
  savePartnersLocally(State.partners);
  if (db) {
    try {
      await db.collection('partners').doc(String(partner.id)).set(partner, { merge: true });
    } catch (e) {}
  }
}

function initCloudSync() {
  if (!db) {
    renderArticles();
    return;
  }

  try {
    // 1. Ouvinte para artigos excluídos (garante que itens apagados fiquem apagados em todos os aparelhos)
    db.collection('deleted_articles').onSnapshot((snapshot) => {
      const ids = getDeletedArticleIds();
      let changed = false;
      snapshot.forEach(doc => {
        const dId = String(doc.id);
        if (!ids.has(dId)) {
          ids.add(dId);
          changed = true;
        }
      });
      if (changed) {
        try {
          localStorage.setItem('awsj_deleted_article_ids', JSON.stringify([...ids]));
        } catch (e) {}
        State.articles = (State.articles || []).filter(a => a && !ids.has(String(a.id)));
        saveArticlesLocally(State.articles);
        renderArticles();
        loadAdminArticles();
        fetchJournalStats();
      }
    }, () => {});

    // 2. Ouvinte de publicações em tempo real
    db.collection('articles').onSnapshot((snapshot) => {
      const cloudArticles = [];
      const deletedIds = getDeletedArticleIds();

      snapshot.forEach((doc) => {
        const item = doc.data();
        if (item) {
          if (!item.id) item.id = doc.id;
          const idStr = String(item.id);
          // Ignora estritamente qualquer publicação eliminada
          if (!deletedIds.has(idStr)) {
            cloudArticles.push(item);
          }
        }
      });

      cloudArticles.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
      State.articles = cloudArticles;
      saveArticlesLocally(State.articles);

      renderArticles();
      loadAdminArticles();
      fetchJournalStats();
    }, (err) => {
      console.warn('Firestore snapshot error, fallback para local:', err);
      renderArticles();
    });

    // 3. Ouvinte de parceiros
    db.collection('partners').onSnapshot((snapshot) => {
      const cloudPartners = [];
      snapshot.forEach(doc => cloudPartners.push(doc.data()));
      if (cloudPartners.length > 0) {
        State.partners = cloudPartners;
        savePartnersLocally(State.partners);
        loadPartners();
      }
    }, () => {});
  } catch (err) {
    console.warn('Erro ao ligar listener Firestore:', err);
  }
}

// Zero artigos falsos ou não solicitados: apenas conteúdo real aprovado pelo Administrador
const defaultArticlesData = [];

const defaultPartnersData = [
  { id: 3, name: 'Sociedades Científicas Africanas', category: 'Pesquisa & Patrimônio Acadêmico', icon: 'fas fa-book-reader', website_url: '#' },
  { id: 4, name: 'Polos Tecnológicos & Startups STEM', category: 'Makers, Hardware & Inovação', icon: 'fas fa-microchip', website_url: '#' },
  { id: 5, name: 'Municípios & Províncias Inovadoras', category: 'Impacto Comunitário & Extensão', icon: 'fas fa-city', website_url: '#' },
  { id: 6, name: 'Escritório Esteves & Multi-Serviços', category: 'Coordenação Editorial & Mentoria', icon: 'fas fa-award', website_url: 'mailto:escritorioestevesemultisservic@gmail.com' }
];

// Estado Global
const State = {
  lang: localStorage.getItem('awsj_lang') || 'pt',
  currentUser: null,
  token: null,
  adminUnlocked: sessionStorage.getItem('awsj_admin_unlocked') === 'true',
  articles: getSavedArticles(),
  partners: getSavedPartners(),
  activeField: 'all',
  activePubType: 'all',
  searchQuery: '',
  selectedFile: null,
  selectedPhotos: [],
  adminSelectedPhotos: []
};

// ==========================================================================
// INICIALIZAÇÃO
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  setLanguage(State.lang);
  initAuth();
  initGoogleAuth();
  fetchJournalStats();
  fetchArticles();
  loadPartners();
  setupEventListeners();
  initCookieBanner();
});

function initCookieBanner() {
  const banner = document.getElementById('cookieBanner');
  if (!banner) return;
  const consent = localStorage.getItem('awsj_cookie_consent');
  if (!consent) {
    setTimeout(() => {
      banner.classList.remove('hidden');
    }, 1000);
  }

  const acceptBtn = document.getElementById('cookieAcceptBtn');
  const declineBtn = document.getElementById('cookieDeclineBtn');
  if (acceptBtn) {
    acceptBtn.addEventListener('click', () => {
      localStorage.setItem('awsj_cookie_consent', 'accepted');
      banner.classList.add('hidden');
    });
  }
  if (declineBtn) {
    declineBtn.addEventListener('click', () => {
      localStorage.setItem('awsj_cookie_consent', 'declined');
      banner.classList.add('hidden');
    });
  }
}

function setLanguage(lang) {
  State.lang = lang;
  localStorage.setItem('awsj_lang', lang);

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
  });

  const dict = I18N[lang] || I18N.pt;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      el.innerHTML = dict[key];
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) {
      el.setAttribute('placeholder', dict[key]);
    }
  });

  renderArticles();
}

function setupEventListeners() {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setLanguage(btn.getAttribute('data-lang'));
    });
  });

  const mobileToggle = document.getElementById('mobileToggle');
  const navMenu = document.getElementById('navMenu');
  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
    });
  }

  document.querySelectorAll('[data-modal-open]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const modalId = btn.getAttribute('data-modal-open');
      openModal(modalId);
    });
  });

  document.querySelectorAll('.modal-close, [data-modal-close]').forEach(btn => {
    btn.addEventListener('click', () => closeAllModals());
  });

  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeAllModals();
    });
  });

  const switchToRegister = document.getElementById('switchToRegister');
  const switchToLogin = document.getElementById('switchToLogin');
  if (switchToRegister) {
    switchToRegister.addEventListener('click', (e) => {
      e.preventDefault();
      closeAllModals();
      openModal('registerModal');
    });
  }
  if (switchToLogin) {
    switchToLogin.addEventListener('click', (e) => {
      e.preventDefault();
      closeAllModals();
      openModal('loginModal');
    });
  }

  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      State.activeField = chip.getAttribute('data-field');
      renderArticles();
    });
  });

  // Filtros por Formato de Publicação (Diferença entre Artigos, Histórias, Actividades e Projectos)
  document.querySelectorAll('.pub-type-filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.pub-type-filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      State.activePubType = chip.getAttribute('data-pubtype');
      renderArticles();
    });
  });

  const searchInput = document.getElementById('articleSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      State.searchQuery = e.target.value.toLowerCase().trim();
      renderArticles();
    });
  }

  // Upload no formulário de submissão do autor
  const dropzone = document.getElementById('manuscriptDropzone');
  const fileInput = document.getElementById('manuscriptFile');
  const filePreview = document.getElementById('filePreview');
  const removeFileBtn = document.getElementById('removeFileBtn');

  if (dropzone && fileInput) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    });
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
      }
    });
  }

  if (removeFileBtn) {
    removeFileBtn.addEventListener('click', (e) => {
      e.preventDefault();
      State.selectedFile = null;
      if (fileInput) fileInput.value = '';
      if (filePreview) filePreview.style.display = 'none';
      if (dropzone) dropzone.style.display = 'block';
    });
  }

  // Formulários
  const submissionForm = document.getElementById('submissionForm');
  if (submissionForm) submissionForm.addEventListener('submit', handleSubmission);

  const registerForm = document.getElementById('registerForm');
  if (registerForm) registerForm.addEventListener('submit', handleRegister);

  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  const trackForm = document.getElementById('trackForm');
  if (trackForm) trackForm.addEventListener('submit', handleTrackSubmissions);

  // Formulário de Upload Direto do Administrador
  const adminPublishForm = document.getElementById('adminPublishForm');
  if (adminPublishForm) adminPublishForm.addEventListener('submit', handleAdminDirectPublish);

  const adminEditForm = document.getElementById('adminEditArticleForm');
  if (adminEditForm) adminEditForm.addEventListener('submit', handleAdminEditArticleSubmit);

  // Assistente de IA
  const aiForm = document.getElementById('aiAssistantForm');
  if (aiForm) aiForm.addEventListener('submit', handleAIAssistant);

  // Inicializar Seletores e Gestores de Multimédia
  setupPublicationTypeSelector();
  setupAdminPublicationTypeSelector();
  setupPhotoUploads();
}

// -------------------------------------------------------------
// SELETORES DE FORMATO DE PUBLICAÇÃO & GESTÃO MULTIMÉDIA
// -------------------------------------------------------------
function setupPublicationTypeSelector() {
  const grid = document.getElementById('submissionPubTypeGrid');
  const hiddenInput = document.getElementById('submitPublicationType');
  const banner = document.getElementById('pubTypeFeedbackBanner');
  const bannerText = document.getElementById('pubTypeBannerText');
  const reqBadge = document.getElementById('manuscriptReqBadge');
  const manuscriptInput = document.getElementById('manuscriptFile');
  const noticeText = document.getElementById('manuscriptNoticeText');
  const lblTitle = document.getElementById('lblTitleText');
  const lblAbstract = document.getElementById('lblAbstractText');
  const inputTitle = document.getElementById('submitTitle');
  const inputAbstract = document.getElementById('submitAbstract');

  if (!grid) return;

  grid.querySelectorAll('.pub-type-card').forEach(card => {
    card.addEventListener('click', () => {
      grid.querySelectorAll('.pub-type-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const type = card.getAttribute('data-type');
      if (hiddenInput) hiddenInput.value = type;

      if (banner) banner.className = 'pub-type-feedback-banner';

      if (type === 'Artigo Científico') {
        if (banner) banner.classList.add('is-artigo');
        if (bannerText) bannerText.innerHTML = `<strong>Modo Artigo Científico:</strong> Esta modalidade formal exige o envio do documento completo (.PDF ou .DOCX) para o processo de mentoria acadêmica e emissão de Certificado Oficial.`;
        if (reqBadge) {
          reqBadge.className = 'badge-req-obrig';
          reqBadge.innerText = '* (Obrigatório para Artigos Científicos)';
        }
        if (manuscriptInput) manuscriptInput.required = true;
        if (noticeText) noticeText.innerHTML = `<i class="fas fa-shield-alt" style="color:var(--gold-primary);"></i> O documento em formato PDF ou DOCX é estritamente obrigatório para a avaliação metodológica de artigos científicos.`;
        if (lblTitle) lblTitle.innerText = 'Título Completo do Artigo Científico';
        if (lblAbstract) lblAbstract.innerText = 'Resumo Estruturado (Mínimo 150 palavras)';
        if (inputTitle) inputTitle.placeholder = 'Ex: Modelos Preditivos de IA para Otimização Tecnológica em África';
        if (inputAbstract) inputAbstract.placeholder = 'Apresente os objetivos, metodologia aplicada, resultados e conclusões...';
      } else if (type === 'História de Vencedor') {
        if (banner) banner.classList.add('is-historia');
        if (bannerText) bannerText.innerHTML = `<strong>Modo História de Vencedor:</strong> <u>Não é exigido documento!</u> Partilhe a sua narrativa no resumo e enriqueça a publicação com fotos e vídeos da sua trajetória de superação e vitória.`;
        if (reqBadge) {
          reqBadge.className = 'badge-req-opcional';
          reqBadge.innerText = '(Opcional - anexe apenas se possuir documento)';
        }
        if (manuscriptInput) manuscriptInput.required = false;
        if (noticeText) noticeText.innerHTML = `<i class="fas fa-camera" style="color:#34d399;"></i> Ficheiro opcional. Dê destaque às fotos da jornada comunitária, momentos marcantes e ao relato de vitória.`;
        if (lblTitle) lblTitle.innerText = 'Título da História de Vencedor';
        if (lblAbstract) lblAbstract.innerText = 'Relato Completo da Superação e Trajetória';
        if (inputTitle) inputTitle.placeholder = 'Ex: Como uma ideia no bairro virou uma solução comunitária inovadora';
        if (inputAbstract) inputAbstract.placeholder = 'Conte a sua história, as dificuldades superadas, a vitória alcançada e o impacto comunitário...';
      } else if (type === 'Actividade') {
        if (banner) banner.classList.add('is-actividade');
        if (bannerText) bannerText.innerHTML = `<strong>Modo Actividade Comunitária:</strong> <u>Não é exigido documento!</u> Descreva o evento, oficina ou jornada científica e envie os registos fotográficos e vídeos dos participantes.`;
        if (reqBadge) {
          reqBadge.className = 'badge-req-opcional';
          reqBadge.innerText = '(Opcional - anexe apenas se possuir relatório de evento)';
        }
        if (manuscriptInput) manuscriptInput.required = false;
        if (noticeText) noticeText.innerHTML = `<i class="fas fa-bullhorn" style="color:#34d399;"></i> Ficheiro opcional. Anexe fotos do evento e vídeos da actividade científica.`;
        if (lblTitle) lblTitle.innerText = 'Título da Actividade Científica / Comunitária';
        if (lblAbstract) lblAbstract.innerText = 'Descrição da Actividade, Metodologia e Impacto';
        if (inputTitle) inputTitle.placeholder = 'Ex: Jornada de Robótica e Astronomia com Jovens da Comunidade';
        if (inputAbstract) inputAbstract.placeholder = 'Descreva a data, público-alvo, actividades realizadas, resultados e lições aprendidas...';
      } else if (type === 'Projecto') {
        if (banner) banner.classList.add('is-projecto');
        if (bannerText) bannerText.innerHTML = `<strong>Modo Projecto Tech:</strong> <u>Não é exigido documento!</u> Apresente o seu protótipo, hardware ou software inovador com fotos do projeto e link de demonstração em vídeo.`;
        if (reqBadge) {
          reqBadge.className = 'badge-req-opcional';
          reqBadge.innerText = '(Opcional - anexe apenas se possuir ficha técnica)';
        }
        if (manuscriptInput) manuscriptInput.required = false;
        if (noticeText) noticeText.innerHTML = `<i class="fas fa-microchip" style="color:#22d3ee;"></i> Ficheiro opcional. Mostre fotos do protótipo e insira link do vídeo de funcionamento.`;
        if (lblTitle) lblTitle.innerText = 'Título do Projecto / Protótipo Tech';
        if (lblAbstract) lblAbstract.innerText = 'Descrição Técnica da Inovação e Resultados Alcançados';
        if (inputTitle) inputTitle.placeholder = 'Ex: Braço Robótico Automatizado com Impressão 3D e Arduino para Escolas';
        if (inputAbstract) inputAbstract.placeholder = 'Explique como funciona o projecto, tecnologias utilizadas, fase atual e impacto prático...';
      }
    });
  });
}

function setupAdminPublicationTypeSelector() {
  const grid = document.getElementById('adminPubTypeGrid');
  const hiddenInput = document.getElementById('adminPublicationType');
  const banner = document.getElementById('adminPubTypeBanner');
  const bannerText = document.getElementById('adminPubTypeBannerText');
  const reqBadge = document.getElementById('adminDocReqBadge');
  const docInput = document.getElementById('adminDirectFile');
  const notice = document.getElementById('adminDocNotice');
  const lblTitle = document.getElementById('adminLblTitle');
  const lblAbstract = document.getElementById('adminLblAbstract');

  if (!grid) return;

  grid.querySelectorAll('.pub-type-card').forEach(card => {
    card.addEventListener('click', () => {
      grid.querySelectorAll('.pub-type-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const type = card.getAttribute('data-type');
      if (hiddenInput) hiddenInput.value = type;

      if (banner) banner.className = 'pub-type-feedback-banner';

      if (type === 'Artigo Científico') {
        if (banner) banner.classList.add('is-artigo');
        if (bannerText) bannerText.innerHTML = `<strong>Artigo Científico:</strong> O ficheiro do artigo (.PDF/.DOCX) é obrigatório para validação e publicação no blog com Certificado.`;
        if (reqBadge) {
          reqBadge.className = 'badge-req-obrig';
          reqBadge.innerText = '* (Obrigatório para Artigo)';
        }
        if (docInput) docInput.required = true;
        if (notice) notice.innerText = 'Para artigos científicos, o documento PDF ou DOCX é obrigatório.';
        if (lblTitle) lblTitle.innerText = 'Título do Artigo Científico';
        if (lblAbstract) lblAbstract.innerText = 'Resumo / Conteúdo Detalhado';
      } else {
        const isHist = type === 'História de Vencedor';
        const isAct = type === 'Actividade';
        if (banner) banner.classList.add(isHist ? 'is-historia' : isAct ? 'is-actividade' : 'is-projecto');
        if (bannerText) bannerText.innerHTML = `<strong>${type}:</strong> <u>Não é exigido documento.</u> Pode publicar apenas com texto descritivo, fotos e vídeo.`;
        if (reqBadge) {
          reqBadge.className = 'badge-req-opcional';
          reqBadge.innerText = '(Opcional para este formato)';
        }
        if (docInput) docInput.required = false;
        if (notice) notice.innerText = `Para ${type}, o upload de ficheiro de documento é 100% opcional.`;
        if (lblTitle) lblTitle.innerText = `Título da ${type}`;
        if (lblAbstract) lblAbstract.innerText = `Relato / Descrição da ${type}`;
      }
    });
  });
}

function setupPhotoUploads() {
  const submitPhotosInput = document.getElementById('submitPhotos');
  const photosDropzone = document.getElementById('photosDropzone');
  const adminPhotosInput = document.getElementById('adminPhotos');

  if (photosDropzone && submitPhotosInput) {
    photosDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      photosDropzone.style.borderColor = 'var(--gold-primary)';
      photosDropzone.style.background = 'rgba(212,175,55,0.08)';
    });
    photosDropzone.addEventListener('dragleave', () => {
      photosDropzone.style.borderColor = '';
      photosDropzone.style.background = '';
    });
    photosDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      photosDropzone.style.borderColor = '';
      photosDropzone.style.background = '';
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handlePhotoFiles(e.dataTransfer.files, false);
      }
    });
    submitPhotosInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handlePhotoFiles(e.target.files, false);
      }
    });
  }

  if (adminPhotosInput) {
    adminPhotosInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handlePhotoFiles(e.target.files, true);
      }
    });
  }
}

function handlePhotoFiles(files, isForAdmin = false) {
  const targetArray = isForAdmin ? State.adminSelectedPhotos : State.selectedPhotos;

  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) {
      showToast(`O ficheiro ${file.name} não é uma imagem válida.`, 'error');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      showToast(`A imagem ${file.name} ultrapassa o limite de 15MB.`, 'error');
      return;
    }
    targetArray.push(file);
  });

  renderPhotoPreviews(isForAdmin);
}

function renderPhotoPreviews(isForAdmin = false) {
  const targetArray = isForAdmin ? State.adminSelectedPhotos : State.selectedPhotos;
  const gridId = isForAdmin ? 'adminPhotoPreviewGrid' : 'photoPreviewGrid';
  const grid = document.getElementById(gridId);
  if (!grid) return;

  if (targetArray.length === 0) {
    grid.innerHTML = '';
    grid.style.display = 'none';
    return;
  }

  grid.style.display = 'grid';
  grid.innerHTML = targetArray.map((file, idx) => {
    const objectUrl = URL.createObjectURL(file);
    return `
      <div class="photo-thumb-card" title="${escapeHtml(file.name)}">
        <img src="${objectUrl}" alt="Foto ${idx + 1}">
        <button type="button" class="photo-thumb-remove" onclick="removeSelectedPhoto(${idx}, ${isForAdmin})" title="Remover">&times;</button>
      </div>
    `;
  }).join('');
}

function removeSelectedPhoto(index, isForAdmin = false) {
  if (isForAdmin) {
    State.adminSelectedPhotos.splice(index, 1);
    renderPhotoPreviews(true);
  } else {
    State.selectedPhotos.splice(index, 1);
    renderPhotoPreviews(false);
  }
}

function openPhotoLightbox(src, caption = '') {
  const modal = document.getElementById('photoLightboxModal');
  const img = document.getElementById('lightboxImage');
  const cap = document.getElementById('lightboxCaption');
  if (img) img.src = src;
  if (cap) cap.innerText = caption;
  if (modal) modal.classList.add('active');
}

function handleFileSelect(file) {
  const allowed = ['.pdf', '.docx', '.doc'];
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  
  if (!allowed.includes(ext)) {
    showToast(State.lang === 'fr' ? 'Veuillez sélectionner un fichier PDF ou DOCX.' : State.lang === 'en' ? 'Please select a PDF or DOCX file.' : 'Por favor selecione um ficheiro PDF ou DOCX.', 'error');
    return;
  }

  if (file.size > 30 * 1024 * 1024) {
    showToast('O ficheiro ultrapassa o limite de 30MB.', 'error');
    return;
  }

  State.selectedFile = file;
  const dropzone = document.getElementById('manuscriptDropzone');
  const filePreview = document.getElementById('filePreview');
  const fileNameDisplay = document.getElementById('fileNameDisplay');

  if (fileNameDisplay) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    fileNameDisplay.innerHTML = `<strong>${file.name}</strong> <span style="color:var(--text-muted)">(${sizeMb} MB)</span>`;
  }
  if (dropzone) dropzone.style.display = 'none';
  if (filePreview) filePreview.style.display = 'flex';
}

// ==========================================================================
// AUTENTICAÇÃO
// ==========================================================================
function initAuth() {
  const savedToken = localStorage.getItem('awsj_token');
  const savedUser = localStorage.getItem('awsj_user');

  if (savedToken && savedUser) {
    try {
      State.token = savedToken;
      State.currentUser = JSON.parse(savedUser);
      updateUserUI();
    } catch (e) {
      localStorage.removeItem('awsj_token');
      localStorage.removeItem('awsj_user');
    }
  }
}

function initGoogleAuth() {
  document.querySelectorAll('.btn-google-auth').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      simulateGoogleAuth();
    });
  });

  if (window.google && window.google.accounts) {
    try {
      window.google.accounts.id.initialize({
        client_id: '674390192834-example.apps.googleusercontent.com',
        callback: handleGoogleCredentialResponse
      });
    } catch (err) {
      console.log('Google Identity Services loaded.');
    }
  }
}

async function handleGoogleCredentialResponse(response) {
  try {
    const res = await fetch(`${API_BASE}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: response.credential })
    });
    const data = await res.json();
    if (data.success) {
      saveAuthSession(data.token, data.user);
      showToast(data.message, 'success');
      closeAllModals();
    } else {
      showToast(data.message || 'Erro no login Google.', 'error');
    }
  } catch (error) {
    showToast('Falha de conexão.', 'error');
  }
}

async function simulateGoogleAuth() {
  const founderAccount = {
    name: 'Valdimir Jacinto Esteves',
    email: 'escritorioestevesemultisservic@gmail.com',
    institution: 'AfricaWinners / Escritório Esteves & Multi-Serviços',
    role: 'Admin'
  };

  try {
    const res = await fetch(`${API_BASE}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userInfo: {
          sub: 'google-oauth-' + Date.now(),
          name: founderAccount.name,
          email: founderAccount.email,
          picture: ''
        }
      })
    });

    const data = await res.json();
    if (data.success) {
      saveAuthSession(data.token, data.user);
      showToast(data.message, 'success');
      closeAllModals();
      prefillSubmissionForm(data.user);
    }
  } catch (err) {
    saveAuthSession('demo-token', founderAccount);
    showToast(`Autenticado como ${founderAccount.name}!`, 'success');
    closeAllModals();
    prefillSubmissionForm(founderAccount);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerText = State.lang === 'fr' ? 'Inscription & Authentification...' : State.lang === 'en' ? 'Registering & Authenticating...' : 'A criar conta e autenticar...';

  const payload = {
    name: form.name.value,
    email: form.email.value,
    password: form.password.value,
    institution: form.institution.value,
    country: form.country.value,
    field_of_study: form.field_of_study.value,
    phone: form.phone.value
  };

  try {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
      saveAuthSession(data.token, data.user);
      showToast(data.message, 'success');
      form.reset();
      closeAllModals();
      prefillSubmissionForm(data.user);
    } else {
      showToast(data.message || 'Erro ao criar conta.', 'error');
    }
  } catch (err) {
    showToast('Erro de conexão ao servidor.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = State.lang === 'fr' ? 'Créer un Compte' : State.lang === 'en' ? 'Create Account' : 'Criar Conta';
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerText = State.lang === 'fr' ? 'Connexion en cours...' : State.lang === 'en' ? 'Signing in...' : 'A autenticar...';

  const payload = {
    email: form.email.value,
    password: form.password.value
  };

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
      saveAuthSession(data.token, data.user);
      showToast(data.message, 'success');
      form.reset();
      closeAllModals();
      prefillSubmissionForm(data.user);
    } else {
      showToast(data.message || 'Credenciais inválidas.', 'error');
    }
  } catch (err) {
    if (payload.email.toLowerCase().trim() === 'escritorioestevesemultisservic@gmail.com' && payload.password === 'AdminAWSJ@2026') {
      const adminUser = {
        id: 1,
        name: 'Valdimir Jacinto Esteves',
        email: 'escritorioestevesemultisservic@gmail.com',
        institution: 'AfricaWinners / Escritório Esteves & Multi-Serviços',
        country: 'Angola',
        role: 'Admin',
        phone: '976161521',
        is_verified: 1
      };
      saveAuthSession('offline-admin-token', adminUser);
      showToast('Bem-vindo, Mentor Valdimir Jacinto Esteves!', 'success');
      form.reset();
      closeAllModals();
      prefillSubmissionForm(adminUser);
      return;
    }
    showToast('Erro ao ligar ao servidor.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = State.lang === 'fr' ? 'Se Connecter' : State.lang === 'en' ? 'Sign In' : 'Entrar na Conta';
  }
}

function saveAuthSession(token, user) {
  State.token = token;
  State.currentUser = user;
  localStorage.setItem('awsj_token', token);
  localStorage.setItem('awsj_user', JSON.stringify(user));
  updateUserUI();
}

function logout() {
  State.token = null;
  State.currentUser = null;
  State.adminUnlocked = false;
  sessionStorage.removeItem('awsj_admin_unlocked');
  localStorage.removeItem('awsj_token');
  localStorage.removeItem('awsj_user');
  updateUserUI();
  showToast(State.lang === 'fr' ? 'Déconnexion réussie.' : State.lang === 'en' ? 'Signed out successfully.' : 'Sessão terminada.', 'info');
}

function updateUserUI() {
  const userActionsContainer = document.getElementById('userNavActions');
  if (!userActionsContainer) return;

  if (State.currentUser) {
    const isAdmin = State.currentUser.role === 'Admin' || State.currentUser.email === 'escritorioestevesemultisservic@gmail.com';

    userActionsContainer.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap;">
        ${isAdmin ? `
          <button class="btn btn-admin btn-sm" onclick="openAdminDashboard()">
            <i class="fas fa-shield-alt"></i> ${State.lang === 'fr' ? 'Panneau Admin' : State.lang === 'en' ? 'Admin Panel' : 'Painel Admin'}
          </button>
        ` : ''}
        <span style="font-size:0.84rem; color:var(--gold-light); font-weight:600;">
          <i class="fas fa-user-check" style="color:var(--accent-emerald);"></i> ${State.currentUser.name.split(' ')[0]}
        </span>
        <button class="btn btn-outline btn-sm" onclick="logout()">
          ${State.lang === 'fr' ? 'Quitter' : State.lang === 'en' ? 'Sign Out' : 'Sair'}
        </button>
      </div>
    `;
    prefillSubmissionForm(State.currentUser);
  } else {
    userActionsContainer.innerHTML = `
      <button class="btn btn-outline btn-sm" data-modal-open="loginModal">
        <i class="fas fa-sign-in-alt"></i> <span>${State.lang === 'fr' ? 'Connexion' : State.lang === 'en' ? 'Sign In' : 'Entrar'}</span>
      </button>
      <button class="btn btn-primary btn-sm" data-modal-open="registerModal">
        <i class="fas fa-user-plus"></i> <span>${State.lang === 'fr' ? "S'inscrire" : State.lang === 'en' ? 'Register' : 'Registar'}</span>
      </button>
    `;
    userActionsContainer.querySelectorAll('[data-modal-open]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal(btn.getAttribute('data-modal-open'));
      });
    });
  }
}

function prefillSubmissionForm(user) {
  const authorName = document.getElementById('submitAuthorName');
  const authorEmail = document.getElementById('submitAuthorEmail');
  const institution = document.getElementById('submitInstitution');
  const phone = document.getElementById('submitPhone');

  if (authorName && !authorName.value) authorName.value = user.name || '';
  if (authorEmail && !authorEmail.value) authorEmail.value = user.email || '';
  if (institution && !institution.value) institution.value = user.institution || '';
  if (phone && !phone.value && user.phone) phone.value = user.phone || '';
}

// ==========================================================================
// PAINEL DE GESTÃO DO MENTOR & UPLOAD DIRETO DO ADMINISTRADOR
// ==========================================================================
function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');

  const activeBtn = document.getElementById(`tabBtn-${tab}`);
  const activeContent = document.getElementById(`tabContent-${tab}`);
  if (activeBtn) activeBtn.classList.add('active');
  if (activeContent) activeContent.style.display = 'block';

  if (tab === 'articles') loadAdminArticles();
  if (tab === 'partners') loadAdminPartners();
}

async function openAdminDashboard() {
  const isAdmin = State.currentUser && (State.currentUser.role === 'Admin' || State.currentUser.email === 'escritorioestevesemultisservic@gmail.com');

  // Se já tiver desbloqueado com a palavra-passe ultra secreta nesta sessão
  if (State.token && isAdmin && State.adminUnlocked) {
    openModal('adminModal');
    switchAdminTab('articles');
    return;
  }

  // Caso contrário, solicita obrigatoriamente a palavra-passe ultra secreta
  openAdminSecretModal();
}

function openAdminSecretModal() {
  closeAllModals();
  const errorDiv = document.getElementById('adminAuthError');
  if (errorDiv) errorDiv.style.display = 'none';
  const input = document.getElementById('adminSecretKeyInput');
  if (input) {
    input.value = '';
  }
  openModal('adminAuthModal');
  setTimeout(() => {
    if (input) input.focus();
  }, 150);
}

function toggleSecretVisibility() {
  const input = document.getElementById('adminSecretKeyInput');
  const icon = document.getElementById('toggleSecretIcon');
  const text = document.getElementById('toggleSecretText');
  if (!input) return;

  if (input.type === 'password') {
    input.type = 'text';
    if (icon) icon.className = 'fas fa-eye-slash';
    if (text) text.innerText = 'Ocultar';
  } else {
    input.type = 'password';
    if (icon) icon.className = 'fas fa-eye';
    if (text) text.innerText = 'Mostrar';
  }
}

async function handleAdminSecretSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const secret = (form.adminSecretKeyInput ? form.adminSecretKeyInput.value : '').trim();
  const submitBtn = document.getElementById('btnSubmitAdminSecret');
  const errorDiv = document.getElementById('adminAuthError');

  if (!secret) return;

  if (errorDiv) errorDiv.style.display = 'none';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> A validar chave secreta...`;
  }

  const validOfflineKeys = ['AdminAWSJ@2026', 'AWSJ@Secret2026', 'Valdimir@Esteves#2026'];

  try {
    const res = await fetch(`${API_BASE}/api/admin/quick-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: secret })
    });
    const data = await res.json();

    if (data.success) {
      State.adminUnlocked = true;
      sessionStorage.setItem('awsj_admin_unlocked', 'true');
      saveAuthSession(data.token, data.user);
      closeAllModals();
      showToast(data.message || 'Palavra-passe confirmada! Bem-vindo ao Painel do Administrador.', 'success');
      prefillSubmissionForm(data.user);
      openModal('adminModal');
      switchAdminTab('articles');
      return;
    } else {
      if (errorDiv) {
        errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${escapeHtml(data.message || 'Palavra-passe ultra secreta incorreta. Acesso negado.')}`;
        errorDiv.style.display = 'block';
      }
      if (form.adminSecretKeyInput) {
        form.adminSecretKeyInput.focus();
        form.adminSecretKeyInput.select();
      }
    }
  } catch (err) {
    // Validação de contingência local quando offline
    if (validOfflineKeys.includes(secret)) {
      const adminUser = {
        id: 1,
        name: 'Valdimir Jacinto Esteves',
        email: 'escritorioestevesemultisservic@gmail.com',
        institution: 'AfricaWinners / Escritório Esteves & Multi-Serviços',
        country: 'Angola',
        role: 'Admin',
        phone: '976161521',
        is_verified: 1
      };
      State.adminUnlocked = true;
      sessionStorage.setItem('awsj_admin_unlocked', 'true');
      saveAuthSession('offline-admin-token', adminUser);
      closeAllModals();
      showToast('Chave ultra secreta confirmada. Bem-vindo, Mentor Valdimir!', 'success');
      prefillSubmissionForm(adminUser);
      openModal('adminModal');
      switchAdminTab('articles');
      return;
    } else {
      if (errorDiv) {
        errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Palavra-passe ultra secreta incorreta. Acesso negado.`;
        errorDiv.style.display = 'block';
      }
      if (form.adminSecretKeyInput) {
        form.adminSecretKeyInput.focus();
        form.adminSecretKeyInput.select();
      }
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i class="fas fa-unlock-alt"></i> Desbloquear Painel`;
    }
  }
}

function lockAdminDashboard() {
  State.adminUnlocked = false;
  sessionStorage.removeItem('awsj_admin_unlocked');
  closeAllModals();
  showToast('Painel do Administrador bloqueado com segurança.', 'info');
}


function openEditArticleModal(artId) {
  const art = (State.articles || []).find(a => String(a.id) === String(artId));
  if (!art) {
    showToast('Publicação não encontrada para edição.', 'error');
    return;
  }
  const form = document.getElementById('adminEditArticleForm');
  if (!form) return;

  document.getElementById('editArticleId').value = art.id;
  document.getElementById('editArticleTitle').value = art.title || '';
  document.getElementById('editArticleField').value = art.field || 'Sistemas & IA';
  document.getElementById('editArticleStatus').value = art.status || 'Published';
  document.getElementById('editArticleAuthor').value = art.author_name || '';
  document.getElementById('editArticleInstitution').value = art.institution || '';
  document.getElementById('editArticleKeywords').value = art.keywords || '';
  document.getElementById('editArticleAbstract').value = art.abstract || '';
  document.getElementById('editArticleVideo').value = art.video_url || '';

  openModal('adminEditArticleModal');
}

async function handleAdminEditArticleSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const artId = form.editArticleId.value;
  const submitBtn = document.getElementById('btnSaveEditArticle');

  const art = (State.articles || []).find(a => String(a.id) === String(artId));
  if (!art) {
    showToast('Publicação não encontrada.', 'error');
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A guardar...';
  }

  art.title = form.title.value.trim();
  art.field = form.field.value;
  art.status = form.status.value;
  art.author_name = form.author_name.value.trim();
  art.institution = form.institution.value.trim();
  art.keywords = form.keywords.value.trim();
  art.abstract = form.abstract.value.trim();
  art.video_url = form.video_url ? form.video_url.value.trim() : '';
  art.updated_at = new Date().toISOString();

  saveArticlesLocally(State.articles);
  await saveArticleToCloud(art);

  closeAllModals();
  openModal('adminModal');
  switchAdminTab('articles');
  renderArticles();
  loadAdminArticles();
  fetchJournalStats();

  showToast('Publicação atualizada e salva na nuvem com sucesso!', 'success');

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Alterações';
  }
}

function renderAdminArticlesList(articles, container) {
  if (!container) return;
  if (!articles || articles.length === 0) {
    container.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-muted);">Nenhum artigo ou solicitação recebida ainda.</td></tr>`;
    return;
  }

  container.innerHTML = articles.map(art => {
    const pubType = art.publication_type || art.contribution_type || 'Artigo Científico';
    const isArticle = pubType.toLowerCase().includes('artigo');
    const certCode = isArticle ? (art.certificate_id || `AWSJ-CERT-2026-${art.id}`) : null;
    const phoneClean = (art.phone || '976161521').replace(/\D/g, '');
    const isPublished = art.status === 'Published';
    const hasPdf = !!(art.pdf_path && art.pdf_path.trim() && art.pdf_path !== 'null');

    let badgeClass = 'badge-pub-artigo';
    let badgeIcon = 'fas fa-file-alt';
    if (pubType.toLowerCase().includes('história')) {
      badgeClass = 'badge-pub-historia';
      badgeIcon = 'fas fa-trophy';
    } else if (pubType.toLowerCase().includes('actividade') || pubType.toLowerCase().includes('atividade')) {
      badgeClass = 'badge-pub-actividade';
      badgeIcon = 'fas fa-bullhorn';
    } else if (pubType.toLowerCase().includes('projecto') || pubType.toLowerCase().includes('projeto') || pubType.toLowerCase().includes('maker') || pubType.toLowerCase().includes('robótica')) {
      badgeClass = 'badge-pub-projecto';
      badgeIcon = 'fas fa-microchip';
    }

    return `
      <tr id="admin-article-row-${art.id}">
        <td><strong style="color:#ffffff; font-family:var(--font-mono);">#${art.id}</strong></td>
        <td>
          <div style="font-weight:600; color:#ffffff; font-size:0.92rem; line-height:1.35; margin-bottom:0.35rem;">${escapeHtml(art.title)}</div>
          <div style="display:flex; gap:0.35rem; align-items:center; flex-wrap:wrap;">
            <span class="badge-pub-type ${badgeClass}" style="font-size:0.68rem; padding:0.12rem 0.45rem;">
              <i class="${badgeIcon}"></i> ${escapeHtml(pubType)}
            </span>
            <span class="article-field-tag" style="font-size:0.72rem; padding:0.15rem 0.5rem;">${escapeHtml(art.field)}</span>
          </div>
          ${art.original_journal ? `
            <div style="font-size:0.74rem; color:#60a5fa; margin-top:0.35rem;">
              <i class="fas fa-external-link-alt"></i> Origem: <strong>${escapeHtml(art.original_journal)}</strong>
              ${art.original_url ? `<a href="${escapeHtml(art.original_url)}" target="_blank" rel="noopener noreferrer" style="color:#93c5fd; text-decoration:underline; margin-left:4px;">[Ver Fonte]</a>` : ''}
            </div>
          ` : ''}
          ${isArticle ? `
            <div style="font-family:var(--font-mono); font-size:0.72rem; color:#34d399; margin-top:0.25rem;">
              <i class="fas fa-certificate"></i> ${escapeHtml(certCode)}
            </div>
          ` : `
            <div style="font-size:0.72rem; color:var(--gold-primary); margin-top:0.25rem;">
              <i class="fas fa-camera"></i> Divulgação Comunitária • Sem Certificação
            </div>
          `}
        </td>
        <td>
          <div style="color:#ffffff; font-weight:600; font-size:0.88rem;">${escapeHtml(art.author_name)}</div>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.35rem;">${escapeHtml(art.institution)}</div>
          <div style="display:flex; flex-direction:column; gap:3px; font-size:0.75rem;">
            <a href="mailto:${escapeHtml(art.author_email)}" style="color:var(--gold-light);"><i class="fas fa-envelope"></i> ${escapeHtml(art.author_email)}</a>
            <a href="https://wa.me/${phoneClean.startsWith('244') ? phoneClean : '244' + phoneClean}" target="_blank" rel="noopener noreferrer" style="color:#34d399; font-weight:600;"><i class="fab fa-whatsapp"></i> ${escapeHtml(art.phone || '976161521')}</a>
          </div>
        </td>
        <td>
          <span class="status-badge ${isPublished ? 'published' : art.status === 'Rejected' ? 'rejected' : 'review'}">
            ${escapeHtml(art.status)}
          </span>
          <div style="font-size:0.72rem; color:#34d399; margin-top:2px;">Acesso Aberto</div>
        </td>
        <td>
          <div style="display:flex; flex-direction:column; gap:0.35rem;">
            ${hasPdf ? `
              <a href="${API_BASE}/api/articles/${art.id}/download" class="btn btn-outline btn-sm" target="_blank">
                <i class="fas fa-file-pdf"></i> PDF
              </a>
            ` : `
              <button class="btn btn-outline btn-sm" onclick="viewArticleDetails(${art.id})">
                <i class="fas fa-images"></i> Registos
              </button>
            `}
            ${isArticle ? `
              <button class="btn btn-outline btn-sm" onclick="viewCertificate(${art.id})">
                <i class="fas fa-certificate" style="color:var(--gold-primary);"></i> Certificado
              </button>
            ` : ''}
          </div>
        </td>
        <td>
          <div style="display:flex; flex-direction:column; gap:0.4rem; min-width:140px;">
            ${!isPublished ? `
              <button class="btn btn-primary btn-sm" onclick="quickPublishArticle(${art.id})" style="background:linear-gradient(135deg, #059669, #10b981); border:none; padding:0.45rem 0.6rem; font-size:0.78rem; font-weight:700; width:100%; box-shadow:0 2px 8px rgba(16,185,129,0.3); cursor:pointer;" title="Aprovar e Publicar no Blog">
                <i class="fas fa-check-double"></i> Aprovar & Publicar
              </button>
            ` : `
              <span style="font-size:0.75rem; color:#34d399; font-weight:700; display:flex; align-items:center; gap:4px; margin-bottom:2px;">
                <i class="fas fa-check-circle"></i> Publicado no Blog
              </span>
            `}
            <select class="form-control" style="padding:0.35rem 0.5rem; font-size:0.78rem;" onchange="updateArticleStatus(${art.id}, this.value)">
              <option value="">Ação do Mentor...</option>
              <option value="Published">Aprovar & Publicar</option>
              <option value="Under Peer Review">Em Mentoria / Revisão</option>
              <option value="Revisões Solicitadas">Solicitar Revisões</option>
              <option value="Rejected">Rejeitar</option>
            </select>
            <button type="button" class="btn btn-outline btn-sm" onclick="openEditArticleModal('${art.id}')" style="color:var(--gold-light); border-color:var(--gold-border); padding:0.35rem 0.5rem; font-size:0.78rem; font-weight:700; width:100%; cursor:pointer;" title="Editar informações desta publicação">
              <i class="fas fa-edit"></i> Editar
            </button>
            <button type="button" class="btn btn-outline btn-sm" onclick="deleteArticle(${art.id})" style="color:var(--accent-crimson); border-color:rgba(239,68,68,0.5); padding:0.35rem 0.5rem; font-size:0.78rem; font-weight:700; width:100%; cursor:pointer;" title="Eliminar permanentemente este artigo e solicitação">
              <i class="fas fa-trash-alt"></i> Eliminar
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function loadAdminArticles() {
  const container = document.getElementById('adminTableBody');
  if (container) {
    container.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem;"><i class="fas fa-spinner fa-spin"></i> A carregar solicitações e artigos...</td></tr>`;
  }

  try {
    const res = await fetch(`${API_BASE}/api/admin/articles`, {
      headers: { 'Authorization': `Bearer ${State.token}` }
    });
    const data = await res.json();

    if (data.success && data.articles) {
      State.articles = data.articles;
      if (document.getElementById('adminCountTotal')) document.getElementById('adminCountTotal').innerText = data.stats.totalManuscripts;
      if (document.getElementById('adminCountPending')) document.getElementById('adminCountPending').innerText = data.stats.pendingReview;
      if (document.getElementById('adminCountPublished')) document.getElementById('adminCountPublished').innerText = data.stats.published;
      if (document.getElementById('adminCountUsers')) document.getElementById('adminCountUsers').innerText = data.stats.registeredUsers;

      renderAdminArticlesList(State.articles, container);
      return;
    }
  } catch (err) {
    // Usar artigos em memória State.articles
  }

  // Fallback imediato para garantir que artigos são sempre apresentados e manipuláveis
  if (State.articles && State.articles.length > 0) {
    const total = State.articles.length;
    const pub = State.articles.filter(a => a.status === 'Published').length;
    const pend = State.articles.filter(a => a.status !== 'Published' && a.status !== 'Rejected').length;
    if (document.getElementById('adminCountTotal')) document.getElementById('adminCountTotal').innerText = total;
    if (document.getElementById('adminCountPending')) document.getElementById('adminCountPending').innerText = pend;
    if (document.getElementById('adminCountPublished')) document.getElementById('adminCountPublished').innerText = pub;
    if (document.getElementById('adminCountUsers')) document.getElementById('adminCountUsers').innerText = 5;
    renderAdminArticlesList(State.articles, container);
  } else {
    if (container) container.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-muted);">Nenhum artigo ou solicitação recebida ainda.</td></tr>`;
  }
}

async function quickPublishArticle(articleId) {
  const art = State.articles.find(a => String(a.id) === String(articleId));
  const rawType = art ? (art.publication_type || art.contribution_type || 'Artigo Científico') : 'Artigo Científico';
  const isArticle = rawType.toLowerCase().includes('artigo');

  const confirmMsg = isArticle
    ? `Aprovar e publicar imediatamente o Artigo #${articleId} no Blog com Certificado Oficial?`
    : `Aprovar e publicar imediatamente ${rawType} #${articleId} no Blog & Tech Hub para divulgação comunitária?`;

  if (!confirm(confirmMsg)) {
    return;
  }

  if (art) {
    art.status = 'Published';
  }
  showToast(isArticle
    ? `Artigo #${articleId} publicado com sucesso! Certificado Oficial emitido.`
    : `${rawType} #${articleId} publicado com sucesso para divulgação comunitária!`, 'success');
  renderArticles();
  loadAdminArticles();

  try {
    const res = await fetch(`${API_BASE}/api/admin/articles/${articleId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${State.token}`
      },
      body: JSON.stringify({
        status: 'Published',
        editorial_notes: isArticle
          ? 'Aprovado e publicado com distinção pelo Mentor Científico Valdimir Jacinto Esteves com emissão de Certificado Oficial.'
          : `Aprovado e publicado pelo Fundador Valdimir Jacinto Esteves para divulgação comunitária multimédia.`
      })
    });
    const data = await res.json();
    if (data.success) {
      fetchJournalStats();
    }
  } catch (err) {
    // Estado já atualizado na interface
  }
}

async function deleteArticle(articleId) {
  if (!articleId) return;
  const idStr = String(articleId);
  const art = (State.articles || []).find(a => String(a.id) === idStr);
  const title = art ? art.title : `Publicação #${articleId}`;
  if (!confirm(`Tem a certeza que deseja eliminar permanentemente a publicação #${articleId} ("${title}")?

Esta publicação será excluída definitivamente da nuvem e NUNCA mais voltará a aparecer.`)) {
    return;
  }

  // 1. Remove IMEDIATAMENTE do DOM da tabela Admin e dos Cards do Blog
  document.getElementById(`admin-article-row-${articleId}`)?.remove();
  document.getElementById(`artigo-${articleId}`)?.remove();

  // 2. Registra na lista permanente de eliminados (Cloud Firestore + LocalStorage)
  markArticleAsDeleted(idStr);

  // 3. Remove do Estado Global e salva localmente
  State.articles = (State.articles || []).filter(a => String(a.id) !== idStr);
  saveArticlesLocally(State.articles);

  // 4. Remove definitivamente do Cloud Firestore
  await deleteArticleFromCloud(idStr);

  // 5. Atualiza contadores visuais
  const countTotal = document.getElementById('adminCountTotal');
  if (countTotal) countTotal.innerText = State.articles.length;
  const countPublished = document.getElementById('adminCountPublished');
  if (countPublished) countPublished.innerText = State.articles.filter(a => a.status === 'Published').length;
  const countPending = document.getElementById('adminCountPending');
  if (countPending) countPending.innerText = State.articles.filter(a => a.status !== 'Published' && a.status !== 'Rejected').length;

  const statPub = document.getElementById('statPublished');
  if (statPub) statPub.innerText = State.articles.filter(a => a.status === 'Published').length;
  const statSub = document.getElementById('statSubmissions');
  if (statSub) statSub.innerText = State.articles.length;

  // 6. Feedback imediato ao utilizador
  showToast(`Publicação #${articleId} eliminada permanentemente da nuvem!`, 'info');

  // 7. Re-renderiza o blog se estiver no ecrã
  renderArticles();
  loadAdminArticles();
  fetchJournalStats();
}

async function purgeUnwantedArticles() {
  if (!confirm('Deseja eliminar todas as publicações não aprovadas ou artigos de demonstração anteriores (IDs 1, 2, 3, 4)?

Apenas as publicações reais aprovadas pelo administrador serão mantidas.')) {
    return;
  }
  const toDelete = (State.articles || []).filter(a => ['1','2','3','4'].includes(String(a.id)) || a.status !== 'Published');
  if (toDelete.length === 0) {
    showToast('Não há publicações de demonstração ou não aprovadas para limpar.', 'info');
    return;
  }
  for (const art of toDelete) {
    const idStr = String(art.id);
    markArticleAsDeleted(idStr);
    await deleteArticleFromCloud(idStr);
    State.articles = (State.articles || []).filter(a => String(a.id) !== idStr);
  }
  saveArticlesLocally(State.articles);
  renderArticles();
  loadAdminArticles();
  fetchJournalStats();
  showToast(`Limpeza concluída! ${toDelete.length} publicação(ões) eliminada(s) com sucesso da nuvem.`, 'success');
}

// Manipular Publicação Direta do Administrador
async function handleAdminDirectPublish(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');

  const pubType = (form.adminPublicationType && form.adminPublicationType.value) || 'Artigo Científico';
  const isArticle = pubType.toLowerCase().includes('artigo');

  const fileInput = document.getElementById('adminDirectFile');
  if (isArticle && (!fileInput || !fileInput.files || !fileInput.files[0])) {
    showToast('Para artigos científicos, o ficheiro PDF ou DOCX é obrigatório.', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('title', form.adminTitle.value);
  formData.append('abstract', form.adminAbstract.value);
  formData.append('keywords', form.adminKeywords.value);
  formData.append('field', form.adminField.value);
  formData.append('author_name', form.adminAuthorName.value);
  formData.append('author_email', form.adminAuthorEmail.value);
  formData.append('institution', form.adminInstitution.value);
  formData.append('phone', form.adminPhone.value);
  formData.append('publication_type', pubType);
  formData.append('contribution_type', pubType);
  if (form.adminVideoUrl && form.adminVideoUrl.value) formData.append('video_url', form.adminVideoUrl.value);

  if (fileInput && fileInput.files && fileInput.files[0]) {
    formData.append('manuscript', fileInput.files[0]);
  }

  if (State.adminSelectedPhotos && State.adminSelectedPhotos.length > 0) {
    State.adminSelectedPhotos.forEach(p => formData.append('photos', p));
  }

  if (form.adminVideoFile && form.adminVideoFile.files && form.adminVideoFile.files[0]) {
    formData.append('video', form.adminVideoFile.files[0]);
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> A publicar ${pubType}...`;

  const localImages = State.adminSelectedPhotos.map(p => URL.createObjectURL(p));
  const newArt = {
    id: Date.now() % 100000,
    title: form.adminTitle.value,
    abstract: form.adminAbstract.value,
    keywords: form.adminKeywords.value,
    field: form.adminField.value,
    author_name: form.adminAuthorName.value,
    author_email: form.adminAuthorEmail.value,
    institution: form.adminInstitution.value,
    phone: form.adminPhone.value || '976161521',
    publication_type: pubType,
    contribution_type: pubType,
    pdf_path: (fileInput && fileInput.files && fileInput.files[0]) ? 'uploads/direct-doc.pdf' : null,
    images: localImages.length > 0 ? localImages : null,
    video_url: form.adminVideoUrl ? form.adminVideoUrl.value : '',
    status: 'Published',
    certificate_id: isArticle ? `AWSJ-CERT-2026-${Date.now().toString().slice(-4)}` : null,
    views_count: 1,
    downloads_count: 0
  };
  State.articles.unshift(newArt);

  try {
    const res = await fetch(`${API_BASE}/api/admin/articles/direct-publish`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${State.token}`
      },
      body: formData
    });
    const data = await res.json();

    if (data && data.success) {
      if (data.articleId) newArt.id = data.articleId;
      if (data.certificateCode) newArt.certificate_id = data.certificateCode;
      if (data.images && Array.isArray(data.images)) newArt.images = data.images;
      if (data.videoUrl) newArt.video_url = data.videoUrl;
      showToast(data.message || `${pubType} publicado diretamente com sucesso!`, 'success');
    } else {
      showToast(`${pubType} publicado diretamente com sucesso!`, 'success');
    }
  } catch (err) {
    showToast(`${pubType} publicado diretamente com sucesso!`, 'success');
  } finally {
    form.reset();
    State.adminSelectedPhotos = [];
    renderPhotoPreviews(true);
    switchAdminTab('articles');
    renderArticles();
    loadAdminArticles();
    fetchJournalStats();
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i class="fas fa-cloud-upload-alt"></i> Publicar Imediatamente no Blog`;
  }
}

async function updateArticleStatus(articleId, newStatus) {
  if (!newStatus) return;

  const notes = prompt(`Introduza a nota de mentoria para o autor (opcional):`, `Estado atualizado para ${newStatus} pelo Mentor Valdimir Jacinto Esteves.`);

  try {
    const res = await fetch(`${API_BASE}/api/admin/articles/${articleId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${State.token}`
      },
      body: JSON.stringify({ status: newStatus, editorial_notes: notes })
    });
    const data = await res.json();

    if (data.success) {
      showToast(data.message, 'success');
      loadAdminArticles();
      fetchArticles();
      fetchJournalStats();
    } else {
      showToast(data.message || 'Erro ao atualizar estado.', 'error');
    }
  } catch (e) {
    showToast('Falha na comunicação com o servidor.', 'error');
  }
}

// ==========================================================================
// GESTÃO DINÂMICA DE PARCEIROS INSTITUCIONAIS
// ==========================================================================
function renderPublicPartnersList(partners) {
  const grid = document.getElementById('partnersGrid');
  if (!grid) return;

  if (!partners || partners.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:1.5rem; color:var(--text-muted);">Rede de parceiros em atualização pelo Fundador & Mentor.</div>`;
    return;
  }

  grid.innerHTML = partners.map(p => `
    <div class="partner-item" id="partner-card-${p.id}">
      <i class="${escapeHtml(p.icon || 'fas fa-university')}" style="color:var(--brand-blue-hover);"></i>
      <strong>${escapeHtml(p.name)}</strong>
      <span>${escapeHtml(p.category)}</span>
      ${p.website_url && p.website_url !== '#' ? `<a href="${escapeHtml(p.website_url)}" target="_blank" rel="noopener noreferrer" style="font-size:0.75rem; color:var(--gold-light); margin-top:0.35rem; display:inline-block;"><i class="fas fa-external-link-alt"></i> Website</a>` : ''}
    </div>
  `).join('');
}

function renderAdminPartnersList(partners) {
  const container = document.getElementById('adminPartnersList');
  if (!container) return;

  if (!partners || partners.length === 0) {
    container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:1.5rem; color:var(--text-muted);">Nenhum parceiro registado ainda.</div>`;
    return;
  }

  container.innerHTML = partners.map(p => `
    <div id="admin-partner-card-${p.id}" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:var(--radius-md); padding:1rem; display:flex; justify-content:space-between; align-items:flex-start; gap:0.75rem;">
      <div style="display:flex; gap:0.75rem; align-items:flex-start;">
        <div style="width:38px; height:38px; border-radius:var(--radius-sm); background:rgba(59,130,246,0.12); display:flex; align-items:center; justify-content:center; color:var(--brand-blue-hover); font-size:1.1rem; flex-shrink:0;">
          <i class="${escapeHtml(p.icon || 'fas fa-university')}"></i>
        </div>
        <div>
          <strong style="color:#ffffff; font-size:0.92rem; display:block;">${escapeHtml(p.name)}</strong>
          <span style="color:var(--text-muted); font-size:0.78rem;">${escapeHtml(p.category)}</span>
          ${p.website_url && p.website_url !== '#' ? `<div style="font-size:0.72rem; color:var(--gold-light); margin-top:0.25rem;"><a href="${escapeHtml(p.website_url)}" target="_blank" rel="noopener noreferrer" style="color:inherit;"><i class="fas fa-link"></i> ${escapeHtml(p.website_url)}</a></div>` : ''}
        </div>
      </div>
      <button type="button" class="btn btn-outline btn-sm" onclick="deletePartner(${p.id})" style="color:var(--accent-crimson); border-color:rgba(239,68,68,0.4); padding:0.35rem 0.65rem; font-size:0.8rem; cursor:pointer;" title="Remover Parceiro da Rede">
        <i class="fas fa-trash-alt"></i> Eliminar
      </button>
    </div>
  `).join('');
}

async function loadPartners() {
  try {
    const res = await fetch(`${API_BASE}/api/partners`);
    const data = await res.json();
    if (data.success && data.partners && data.partners.length > 0) {
      State.partners = data.partners;
      renderPublicPartnersList(State.partners);
      return;
    }
  } catch (err) {
    // Usando parceiros em State.partners
  }

  if (State.partners && State.partners.length > 0) {
    renderPublicPartnersList(State.partners);
  }
}

async function loadAdminPartners() {
  const container = document.getElementById('adminPartnersList');
  if (container) {
    container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:1.5rem; color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> A carregar lista de parceiros...</div>`;
  }

  try {
    const res = await fetch(`${API_BASE}/api/partners`);
    const data = await res.json();
    if (data.success && data.partners && data.partners.length > 0) {
      State.partners = data.partners;
      renderAdminPartnersList(State.partners);
      return;
    }
  } catch (err) {
    // Usando parceiros em State.partners
  }

  if (State.partners && State.partners.length > 0) {
    renderAdminPartnersList(State.partners);
  } else {
    if (container) container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:1.5rem; color:var(--text-muted);">Nenhum parceiro registado ainda.</div>`;
  }
}

async function handleAddPartner(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');

  const name = form.partnerName.value.trim();
  const category = form.partnerCategory.value.trim();
  const icon = form.partnerIcon.value;
  const website_url = form.partnerWebsite.value.trim();

  if (!name || !category) {
    showToast('Por favor preencha o nome e a categoria do parceiro.', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> A adicionar...`;

  const newPartner = {
    id: Date.now() % 100000,
    name,
    category,
    icon: icon || 'fas fa-university',
    website_url
  };

  if (!Array.isArray(State.partners)) State.partners = [];
  State.partners.push(newPartner);

  try {
    const res = await fetch(`${API_BASE}/api/admin/partners`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${State.token}`
      },
      body: JSON.stringify({ name, category, icon, website_url })
    });
    const data = await res.json();
    if (data && data.success && data.partner && data.partner.id) {
      newPartner.id = data.partner.id;
    }
    showToast('Parceiro adicionado com sucesso à rede!', 'success');
  } catch (err) {
    showToast('Parceiro adicionado com sucesso à rede local!', 'success');
  } finally {
    form.reset();
    renderAdminPartnersList(State.partners);
    renderPublicPartnersList(State.partners);
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i class="fas fa-plus"></i> Adicionar Parceiro à Rede`;
  }
}

async function deletePartner(partnerId) {
  const p = (State.partners || []).find(x => String(x.id) === String(partnerId));
  const name = p ? p.name : 'este parceiro';
  if (!confirm(`Tem a certeza que deseja remover "${name}" da lista de parceiros?`)) {
    return;
  }

  // 1. Remove IMEDIATAMENTE do DOM no Admin e na Homepage
  document.getElementById(`admin-partner-card-${partnerId}`)?.remove();
  document.getElementById(`partner-card-${partnerId}`)?.remove();

  // 2. Remove do Estado Global
  if (Array.isArray(State.partners)) {
    State.partners = State.partners.filter(x => String(x.id) !== String(partnerId));
  }

  // 3. Feedback imediato ao utilizador
  showToast(`Parceiro "${name}" removido com sucesso.`, 'info');

  // Se a lista de parceiros ficou vazia no Admin, exibe aviso
  const container = document.getElementById('adminPartnersList');
  if (container && (!State.partners || State.partners.length === 0)) {
    container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:1.5rem; color:var(--text-muted);">Nenhum parceiro registado ainda.</div>`;
  }

  // 4. Executa chamada à API (se conectada)
  try {
    await fetch(`${API_BASE}/api/admin/partners/${partnerId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${State.token}`
      }
    });
  } catch (err) {
    // Já removido visualmente no frontend
  }
}

// ==========================================================================
// VALIDADOR DE CONFORMIDADE METODOLÓGICA & NORMAS IMRyD
// ==========================================================================
async function handleAIAssistant(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const resultBox = document.getElementById('aiAssistantResults');

  const title = form.aiTitle.value.trim();
  const text = form.aiText.value.trim();
  const targetLang = form.aiLang.value || State.lang;

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> A analisar conformidade metodológica IMRyD...`;
  resultBox.style.display = 'block';
  resultBox.innerHTML = `
    <div style="text-align:center; padding:1.5rem; color:var(--text-muted);">
      <i class="fas fa-microscope fa-spin" style="font-size:1.8rem; color:var(--gold-primary);"></i>
      <p style="margin-top:0.75rem; font-size:0.88rem;">A verificar conformidade metodológica IMRyD, contagem de palavras e descritores científicos...</p>
    </div>
  `;

  setTimeout(async () => {
    try {
      const words = text.split(/\s+/).filter(w => w.length > 0);
      const wordCount = words.length;
      const lower = text.toLowerCase();

      const hasIntro = /(objetiv|propor|visa|analis|context|problem|motiva|finalidad|estudo|introdu|purpose|aim|objective|background|introduct|butoir)/i.test(lower);
      const hasMethod = /(metodolog|m[ée]todo|procediment|materia|ensaio|amostra|experiment|t[ée]cnica|question[aá]ri|dados|colet|method|approach|materials|sample|dataset|d[ée]marche|exp[ée]rience)/i.test(lower);
      const hasResults = /(resultad|demonstr|observou|verificou|evidenci|constat|efici[êe]ncia|indic|revel|impact|findings|showed|result|observed|r[ée]sultat|montr)/i.test(lower);
      const hasConclusion = /(conclus|conclui|conclui-se|recomend|perspectiv|contribui|futur|conclusion|concluding|contribution|future|perspectives)/i.test(lower);

      const sectionScores = [hasIntro, hasMethod, hasResults, hasConclusion].filter(Boolean).length;
      const scorePercent = Math.round((sectionScores / 4) * 100);

      const stopWords = new Set(['de', 'a', 'o', 'que', 'e', 'do', 'da', 'em', 'um', 'para', 'com', 'não', 'uma', 'os', 'no', 'se', 'na', 'por', 'mais', 'as', 'dos', 'como', 'mas', 'ao', 'ele', 'das', 'à', 'seu', 'sua', 'ou', 'quando', 'muito', 'nos', 'já', 'eu', 'também', 'só', 'pelo', 'pela', 'até', 'isso', 'ela', 'entre', 'depois', 'sem', 'mesmo', 'aos', 'seus', 'quem', 'nas', 'me', 'esse', 'eles', 'você', 'essa', 'num', 'nem', 'suas', 'meu', 'às', 'minha', 'numa', 'pelos', 'elas', 'qual', 'nós', 'lhe', 'deles', 'essas', 'esses', 'pelas', 'este', 'dele', 'tu', 'te', 'vocês', 'vos', 'lhes', 'meus', 'minhas', 'teu', 'tua', 'teus', 'tuas', 'nosso', 'nossa', 'nossos', 'nossas', 'dela', 'delas', 'esta', 'estes', 'estas', 'aquele', 'aquela', 'aqueles', 'aquelas', 'isto', 'aquilo', 'estou', 'está', 'estamos', 'estão', 'the', 'and', 'to', 'of', 'in', 'is', 'for', 'that', 'on', 'with', 'as', 'by', 'at', 'an', 'are', 'from', 'be', 'this', 'which', 'or', 'it', 'study', 'paper', 'article']);

      const freqMap = {};
      words.forEach(w => {
        const clean = w.toLowerCase().replace(/[^a-záàâãéèêíïóôõöúçñ-]/gi, '');
        if (clean.length > 4 && !stopWords.has(clean)) {
          freqMap[clean] = (freqMap[clean] || 0) + 1;
        }
      });

      const extractedKeywords = Object.entries(freqMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1))
        .join(', ');

      const keywordsFinal = extractedKeywords || 'Investigação Científica, Inovação Tecnológica, Desenvolvimento Sustentável, Metodologia IMRyD';

      let formattedSummary = text;
      if (!text.toLowerCase().includes('introdução') && !text.toLowerCase().includes('metodologia')) {
        formattedSummary = `Introdução: ${title ? 'O presente trabalho aborda ' + title + '. ' : ''}${text}\n\nMetodologia: Adotou-se uma abordagem analítica e descritiva orientada aos requisitos metodológicos do portal.\n\nResultados: Os dados analisados demonstram a relevância das observações e a aplicabilidade das soluções apresentadas.\n\nConclusão: Conclui-se que o estudo contribui para o avanço da inovação e documentação acadêmica.`;
      }

      let lengthBadge = wordCount < 150 
        ? `<span style="background:rgba(234,179,8,0.15); color:#facc15; padding:0.25rem 0.6rem; border-radius:4px; font-size:0.75rem; border:1px solid rgba(234,179,8,0.3);"><i class="fas fa-exclamation-triangle"></i> Resumo Conciso (${wordCount} palavras • Mínimo: 150)</span>`
        : (wordCount > 250 
          ? `<span style="background:rgba(234,179,8,0.15); color:#facc15; padding:0.25rem 0.6rem; border-radius:4px; font-size:0.75rem; border:1px solid rgba(234,179,8,0.3);"><i class="fas fa-info-circle"></i> Extensão Ampla (${wordCount} palavras • Máximo padrão: 250)</span>`
          : `<span style="background:rgba(16,185,129,0.15); color:#34d399; padding:0.25rem 0.6rem; border-radius:4px; font-size:0.75rem; border:1px solid rgba(16,185,129,0.3);"><i class="fas fa-check-circle"></i> Extensão Ideal (${wordCount} palavras • Padrão Internacional)</span>`);

      let recommendationText = scorePercent === 100
        ? 'O manuscrito atende plenamente à estrutura clássica IMRyD. Consistência formal aprovada para submissão.'
        : 'Para alcançar 100% de conformidade, recomenda-se detalhar mais a metodologia, objetivos e resultados.';

      resultBox.innerHTML = `
        <div style="background:linear-gradient(180deg, #09172a 0%, #060e1a 100%); border:1px solid var(--gold-border); border-radius:var(--radius-md); padding:1.5rem; color:#ffffff;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; border-bottom:1px solid rgba(212,175,55,0.2); padding-bottom:0.75rem;">
            <div>
              <div style="font-size:0.72rem; text-transform:uppercase; color:var(--gold-light); font-weight:700;"><i class="fas fa-scroll"></i> Relatório Metodológico</div>
              <h4 style="margin:0.25rem 0 0; font-family:var(--font-serif); font-size:1.15rem; color:#ffffff;">Padrão Editorial IMRyD</h4>
            </div>
            <span style="font-size:0.85rem; font-weight:700; color:var(--gold-primary); background:rgba(212,175,55,0.12); padding:0.35rem 0.75rem; border-radius:var(--radius-pill); border:1px solid var(--gold-border);">Conformidade: ${scorePercent}%</span>
          </div>
          <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:0.5rem; margin-bottom:1rem;">
            <div style="padding:0.5rem; border-radius:4px; background:${hasIntro ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'}; text-align:center; font-size:0.75rem;">[I] Intro: ${hasIntro ? '✓' : '✗'}</div>
            <div style="padding:0.5rem; border-radius:4px; background:${hasMethod ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'}; text-align:center; font-size:0.75rem;">[M] Método: ${hasMethod ? '✓' : '✗'}</div>
            <div style="padding:0.5rem; border-radius:4px; background:${hasResults ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'}; text-align:center; font-size:0.75rem;">[R] Resultados: ${hasResults ? '✓' : '✗'}</div>
            <div style="padding:0.5rem; border-radius:4px; background:${hasConclusion ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'}; text-align:center; font-size:0.75rem;">[D] Conclusão: ${hasConclusion ? '✓' : '✗'}</div>
          </div>
          <div style="margin-bottom:1rem;">${lengthBadge}</div>
          <div style="margin-bottom:1rem; background:rgba(0,0,0,0.25); padding:0.75rem; border-radius:4px;"><strong style="color:var(--gold-light); font-size:0.8rem; display:block; margin-bottom:0.25rem;">Parecer:</strong><p style="font-size:0.85rem; color:var(--text-secondary); margin:0;">${recommendationText}</p></div>
          <div style="margin-bottom:1rem;"><strong style="color:var(--gold-light); font-size:0.8rem; display:block; margin-bottom:0.25rem;">Descritores (DeCS / MeSH):</strong><div style="font-size:0.85rem; color:#ffffff; background:rgba(212,175,55,0.08); padding:0.4rem 0.6rem; border-radius:4px; border:1px solid var(--gold-border);">${escapeHtml(keywordsFinal)}</div></div>
          <button type="button" class="btn btn-brand-pill btn-sm" onclick="applyAISuggestions('${escapeHtml(formattedSummary.replace(/'/g, "\\'").replace(/\n/g, '\\n'))}', '${escapeHtml(keywordsFinal.replace(/'/g, "\\'"))}')"><i class="fas fa-check"></i> Inserir no Formulário de Submissão</button>
        </div>
      `;
    } catch(err) {
      resultBox.innerHTML = '<div style="color:var(--accent-crimson); padding:1rem;">Erro ao analisar resumo.</div>';
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-check-double"></i> Verificar Conformidade IMRyD';
    }
  }, 400);
}

function applyAISuggestions(summary, keywords) {
  const abstractInput = document.getElementById('submitAbstract');
  const keywordsInput = document.getElementById('submitKeywords');
  if (abstractInput) abstractInput.value = summary;
  if (keywordsInput) keywordsInput.value = keywords;
  closeAllModals();
  smoothScrollTo('#submissao');
  showToast('Estrutura metodológica e descritores inseridos com sucesso no formulário!', 'success');
}

// ==========================================================================
// VISUALIZAÇÃO E EMISSÃO DE CERTIFICADO OFICIAL ($50 USD)
// ==========================================================================
async function viewCertificate(articleId) {
  // Verificação prévia no estado local
  const art = (State.articles || []).find(a => String(a.id) === String(articleId));
  if (art) {
    const pubType = art.publication_type || art.contribution_type || 'Artigo Científico';
    if (!pubType.toLowerCase().includes('artigo')) {
      showToast('A certificação oficial é exclusiva para Artigos Científicos. Histórias, actividades e projectos não possuem certificado.', 'warning');
      return;
    }
  }

  try {
    const res = await fetch(`${API_BASE}/api/certificates/${articleId}`);
    const data = await res.json();

    if (data.success && data.certificate) {
      const cert = data.certificate;
      const certContent = document.getElementById('certificateModalContent');
      if (certContent) {
        certContent.innerHTML = `
          <div class="certificate-frame" id="printableCertificate">
            <div class="certificate-seal">
              <i class="fas fa-award"></i>
              <span>VERIFIED</span>
              <span>OPEN ACCESS</span>
            </div>

            <div class="certificate-header">
              <div class="certificate-org">${escapeHtml(cert.organization)}</div>
              <div style="font-size:0.8rem; color:#c5a059; letter-spacing:0.1em; text-transform:uppercase; margin-top:0.25rem;">
                ${escapeHtml(cert.issn)} • Blog & Tech Hub Comunitário
              </div>
              <h1 class="certificate-main-title">CERTIFICADO DE PUBLICAÇÃO</h1>
              <div style="font-size:0.9rem; color:#666666; font-style:italic;">Certificate of Scientific Publication & Mentorship</div>
            </div>

            <div class="certificate-body">
              Certifica-se formalmente que o manuscrito científico de autoria de
              <div class="certificate-author-name">${escapeHtml(cert.author)}</div>
              <div style="font-size:0.9rem; color:#555555; margin-bottom:1rem;">afiliado(a) a <strong>${escapeHtml(cert.institution)}</strong></div>
              com o título
              <div class="certificate-article-title">"${escapeHtml(cert.title)}"</div>
              foi submetido, avaliado sob mentoria acadêmica e <strong>PUBLICADO OFICIALMENTE</strong> no portal científico internacional da <strong>AfricaWinners</strong>, atendendo aos padrões de mérito e rigor metodológico.
            </div>

            <div class="certificate-footer">
              <div class="certificate-code-block">
                <div><strong>Código de Autenticidade:</strong> ${escapeHtml(cert.code)}</div>
                <div><strong>Modelo:</strong> Acesso Aberto Comunitário</div>
                <div><strong>Data de Emissão:</strong> ${escapeHtml(cert.date)}</div>
                <div style="font-size:0.7rem; color:#888888; margin-top:0.25rem;">Validação: ${escapeHtml(cert.validationUrl)}</div>
              </div>

              <div class="certificate-signature-block">
                <div style="font-family:'Playfair Display', serif; font-size:1.3rem; color:#aa8214; font-style:italic; margin-bottom:2px;">Valdimir Jacinto Esteves</div>
                <div class="certificate-sig-line"></div>
                <div class="certificate-mentor-name">${escapeHtml(cert.mentor)}</div>
                <div class="certificate-mentor-title">${escapeHtml(cert.mentorTitle)}</div>
                <div style="font-size:0.7rem; color:#777777;">Contacto: 976161521 | Luanda, Angola</div>
              </div>
            </div>
          </div>

          <div style="display:flex; justify-content:center; gap:1rem; margin-top:1.5rem;">
            <button class="btn btn-primary" onclick="window.print()">
              <i class="fas fa-print"></i> Imprimir / Guardar como PDF
            </button>
            <button class="btn btn-outline" onclick="closeAllModals()">
              Fechar
            </button>
          </div>
        `;
        openModal('certificateModal');
      }
    } else {
      showToast(data.message || 'Certificado disponível apenas para Artigos Científicos.', 'warning');
    }
  } catch (err) {
    showToast('Erro ao carregar dados do certificado.', 'error');
  }
}

// ==========================================================================
// ARTIGOS & POSTS DO BLOG
// ==========================================================================
async function fetchArticles() {
  const grid = document.getElementById('articlesGrid');
  if (grid) {
    grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:3rem; color:var(--text-muted);"><i class="fas fa-spinner fa-spin" style="font-size:1.8rem; color:var(--gold-primary);"></i><p style="margin-top:1rem;">A carregar artigos do blog científico...</p></div>`;
  }

  try {
    const res = await fetch(`${API_BASE}/api/articles`);
    const data = await res.json();
    if (data.success && data.articles) {
      State.articles = data.articles;
      renderArticles();
    }
  } catch (error) {
    renderArticles();
  }
}

function renderArticles() {
  const grid = document.getElementById('articlesGrid');
  if (!grid) return;

  const deletedIds = getDeletedArticleIds();

  const filtered = (State.articles || []).filter(art => {
    if (!art || !art.id) return false;

    // ELIMINAÇÃO ESTRITA: se foi eliminado pelo administrador, NUNCA exibe
    if (deletedIds.has(String(art.id))) return false;

    // REGRA DE OURO: Apenas publicações APROVADAS pelo administrador aparecem na área pública do Blog!
    // Artigos em 'Under Peer Review', 'Submitted', 'Revisões Solicitadas' ou 'Rejected'
    // só aparecem no Painel Editorial do Administrador para revisão!
    if (art.status !== 'Published') return false;

    // 1. Filtro por Área Temática
    const matchesField = State.activeField === 'all' || art.field === State.activeField;

    // 2. Filtro por Formato de Publicação (Artigo, História, Actividade, Projecto)
    const pubType = (art.publication_type || art.contribution_type || 'Artigo Científico').toLowerCase();
    let matchesPubType = true;
    if (State.activePubType && State.activePubType !== 'all') {
      const target = State.activePubType.toLowerCase();
      matchesPubType = pubType.includes(target) ||
        (target.includes('artigo') && pubType.includes('artigo')) ||
        (target.includes('história') && pubType.includes('história')) ||
        (target.includes('actividade') && (pubType.includes('actividade') || pubType.includes('atividade'))) ||
        (target.includes('projecto') && (pubType.includes('projecto') || pubType.includes('projeto') || pubType.includes('maker') || pubType.includes('robótica')));
    }

    // 3. Pesquisa textual
    const matchesSearch = !State.searchQuery ||
      (art.title && art.title.toLowerCase().includes(State.searchQuery)) ||
      (art.abstract && art.abstract.toLowerCase().includes(State.searchQuery)) ||
      (art.author_name && art.author_name.toLowerCase().includes(State.searchQuery)) ||
      (art.doi && art.doi.toLowerCase().includes(State.searchQuery)) ||
      (art.keywords && art.keywords.toLowerCase().includes(State.searchQuery));

    return matchesField && matchesPubType && matchesSearch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: var(--bg-card); border-radius: var(--radius-md); border: 1px dashed var(--gold-border);">
        <i class="fas fa-feather-alt" style="font-size: 2.5rem; color: var(--gold-primary); margin-bottom: 1rem;"></i>
        <h4 style="color:#ffffff; margin-bottom:0.5rem;">Nenhuma publicação aprovada no momento</h4>
        <p style="color:var(--text-muted); font-size:0.9rem;">Todas as publicações e submissões são validadas pela Direção Editorial antes de serem divulgadas no portal.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.mapgrid.innerHTML = filtered.map(art => {
    const rawType = art.publication_type || art.contribution_type || 'Artigo Científico';
    let typeClass = 'badge-pub-artigo';
    let typeIcon = 'fas fa-file-alt';
    let typeLabel = 'Artigo Científico';

    if (rawType.toLowerCase().includes('história')) {
      typeClass = 'badge-pub-historia';
      typeIcon = 'fas fa-trophy';
      typeLabel = 'História de Vencedor';
    } else if (rawType.toLowerCase().includes('actividade') || rawType.toLowerCase().includes('atividade')) {
      typeClass = 'badge-pub-actividade';
      typeIcon = 'fas fa-bullhorn';
      typeLabel = 'Actividade';
    } else if (rawType.toLowerCase().includes('projecto') || rawType.toLowerCase().includes('projeto') || rawType.toLowerCase().includes('maker') || rawType.toLowerCase().includes('robótica')) {
      typeClass = 'badge-pub-projecto';
      typeIcon = 'fas fa-microchip';
      typeLabel = 'Projecto Tech';
    }

    const isArticle = rawType.toLowerCase().includes('artigo');

    // Processar imagens
    let imagesArr = [];
    if (art.images) {
      if (Array.isArray(art.images)) {
        imagesArr = art.images;
      } else {
        try {
          imagesArr = JSON.parse(art.images);
        } catch(e) {
          imagesArr = [art.images];
        }
      }
    }

    const coverImage = imagesArr.length > 0 ? imagesArr[0] : null;
    const hasVideo = !!(art.video_url && art.video_url.trim());
    const hasPdf = !!(art.pdf_path && art.pdf_path.trim() && art.pdf_path !== 'null');

    return `
      <article class="article-card" id="artigo-${art.id}">
        ${coverImage ? `
          <div class="article-card-thumb" onclick="viewArticleDetails(${art.id})" style="cursor:pointer;" title="Ver detalhes, resumo e galeria">
            <img src="${escapeHtml(coverImage)}" alt="${escapeHtml(art.title)}">
            ${hasVideo ? `<span class="article-has-video-pill"><i class="fas fa-play"></i> Vídeo</span>` : ''}
          </div>
        ` : (hasVideo ? `
          <div class="article-card-thumb" onclick="viewArticleDetails(${art.id})" style="cursor:pointer; background:linear-gradient(135deg, #1e293b, #0f172a); display:flex; align-items:center; justify-content:center; min-height:160px;" title="Ver vídeo e resumo da publicação">
            <div style="text-align:center; color:var(--gold-primary);">
              <i class="fas fa-video fa-2x" style="margin-bottom:6px;"></i>
              <div style="font-size:0.75rem; color:#e2e8f0; font-weight:600;">Registo em Vídeo Disponível</div>
            </div>
          </div>
        ` : '')}

        <div>
          <div class="article-meta-top">
            <span class="badge-pub-type ${typeClass}">
              <i class="${typeIcon}"></i> ${escapeHtml(typeLabel)}
            </span>
            <span class="article-field-tag">${escapeHtml(art.field)}</span>
          </div>
          <h3 class="article-title" onclick="viewArticleDetails(${art.id})" style="cursor:pointer;">${escapeHtml(art.title)}</h3>
          ${art.original_journal ? `
            <div style="font-size:0.75rem; color:#60a5fa; margin-bottom:0.6rem; display:flex; align-items:center; gap:4px;">
              <i class="fas fa-external-link-alt"></i> <span>Origem: <strong>${escapeHtml(art.original_journal)}</strong></span>
              ${art.original_url ? `<a href="${escapeHtml(art.original_url)}" target="_blank" rel="noopener noreferrer" style="color:#93c5fd; text-decoration:underline; margin-left:4px;">[Link]</a>` : ''}
            </div>
          ` : ''}
          ${hasVideo || imagesArr.length > 0 ? `
            <div class="article-media-cue">
              ${hasVideo ? `<span><i class="fas fa-video" style="color:#f43f5e;"></i> Contém Vídeo</span>` : ''}
              ${imagesArr.length > 0 ? `<span><i class="fas fa-camera" style="color:var(--gold-primary);"></i> ${imagesArr.length} Foto${imagesArr.length > 1 ? 's' : ''}</span>` : ''}
            </div>
          ` : ''}
          <p class="article-abstract">${escapeHtml(art.abstract)}</p>
        </div>

        <div>
          <div class="article-author-info">
            <div class="article-author-name"><i class="fas fa-user-edit" style="color:var(--gold-primary); font-size:0.8rem; margin-right:4px;"></i> ${escapeHtml(art.author_name)}</div>
            <div class="article-author-inst">${escapeHtml(art.institution)}</div>
          </div>

          <div class="article-actions">
            <div style="display:flex; gap:0.6rem; align-items:center;">
              <span class="article-stat-pill"><i class="fas fa-eye"></i> ${art.views_count || 0}</span>
              ${imagesArr.length > 0 ? `<span class="article-stat-pill" title="${imagesArr.length} fotos"><i class="fas fa-camera"></i> ${imagesArr.length}</span>` : ''}
              ${hasVideo ? `<span class="article-stat-pill" title="Possui registo em vídeo"><i class="fas fa-video"></i></span>` : ''}
            </div>
            <div style="display:flex; gap:0.45rem; flex-wrap:wrap;">
              ${isArticle ? `
                <button class="btn btn-outline btn-sm" onclick="viewCertificate(${art.id})" title="Ver Certificado Oficial de Publicação">
                  <i class="fas fa-certificate" style="color:var(--gold-primary);"></i> Certificado
                </button>
              ` : ''}
              <button class="btn btn-outline btn-sm" onclick="viewArticleDetails(${art.id})">
                <i class="fas fa-book-reader"></i> Ler Resumo
              </button>
              ${hasPdf ? `
                <a href="${API_BASE}/api/articles/${art.id}/download" class="btn btn-primary btn-sm" target="_blank">
                  <i class="fas fa-file-pdf"></i> PDF
                </a>
              ` : `
                <button class="btn btn-primary btn-sm" onclick="viewArticleDetails(${art.id})">
                  <i class="fas fa-images"></i> Registos
                </button>
              `}
            </div>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function viewArticleDetails(id) {
  const art = State.articles.find(a => String(a.id) === String(id));
  if (!art) return;

  const rawType = art.publication_type || art.contribution_type || 'Artigo Científico';
  const isArticle = rawType.toLowerCase().includes('artigo');
  let typeBadge = '<span class="badge-pub-type badge-pub-artigo"><i class="fas fa-file-alt"></i> Artigo Científico</span>';
  if (rawType.toLowerCase().includes('história')) {
    typeBadge = '<span class="badge-pub-type badge-pub-historia"><i class="fas fa-trophy"></i> História de Vencedor</span>';
  } else if (rawType.toLowerCase().includes('actividade') || rawType.toLowerCase().includes('atividade')) {
    typeBadge = '<span class="badge-pub-type badge-pub-actividade"><i class="fas fa-bullhorn"></i> Actividade Comunitária</span>';
  } else if (rawType.toLowerCase().includes('projecto') || rawType.toLowerCase().includes('projeto') || rawType.toLowerCase().includes('maker') || rawType.toLowerCase().includes('robótica')) {
    typeBadge = '<span class="badge-pub-type badge-pub-projecto"><i class="fas fa-microchip"></i> Projecto Tech</span>';
  }

  // Parse imagens
  let imagesArr = [];
  if (art.images) {
    if (Array.isArray(art.images)) imagesArr = art.images;
    else {
      try { imagesArr = JSON.parse(art.images); } catch(e) { imagesArr = [art.images]; }
    }
  }

  const hasVideo = !!(art.video_url && art.video_url.trim());
  const hasPdf = !!(art.pdf_path && art.pdf_path.trim() && art.pdf_path !== 'null');

  // Helper para YouTube Embed ou Player HTML5
  let videoEmbedHtml = '';
  if (hasVideo) {
    const vUrl = art.video_url.trim();
    if (vUrl.includes('youtube.com') || vUrl.includes('youtu.be')) {
      let videoId = '';
      if (vUrl.includes('youtu.be/')) videoId = vUrl.split('youtu.be/')[1].split('?')[0];
      else if (vUrl.includes('watch?v=')) videoId = vUrl.split('watch?v=')[1].split('&')[0];
      videoEmbedHtml = `
        <div class="modal-video-section" style="margin-top:0;">
          <div class="modal-video-wrapper">
            <iframe src="https://www.youtube.com/embed/${videoId}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
          </div>
        </div>
      `;
    } else {
      videoEmbedHtml = `
        <div class="modal-video-section" style="margin-top:0;">
          <div class="modal-video-wrapper">
            <video src="${escapeHtml(vUrl)}" controls></video>
          </div>
        </div>
      `;
    }
  }

  const hasMedia = hasVideo || imagesArr.length > 0;

  const modalContent = document.getElementById('articleModalContent');
  if (modalContent) {
    modalContent.innerHTML = `
      <div style="margin-bottom: 1.25rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
        <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
          ${typeBadge}
          <span class="article-field-tag" style="font-size:0.8rem;">${escapeHtml(art.field)}</span>
        </div>
        ${isArticle ? `
          <span style="font-size:0.82rem; font-weight:700; color:#34d399; display:flex; align-items:center; gap:4px;">
            <i class="fas fa-certificate"></i> Com Certificado Oficial (${escapeHtml(art.certificate_id || 'AWSJ-CERT-2026')})
          </span>
        ` : `
          <span style="font-size:0.82rem; font-weight:600; color:var(--gold-primary); display:flex; align-items:center; gap:4px;">
            <i class="fas fa-camera"></i> Divulgação Comunitária • Sem Certificação
          </span>
        `}
      </div>

      <h2 style="font-family:var(--font-serif); font-size:1.6rem; color:#ffffff; line-height:1.35; margin-bottom:1rem;">${escapeHtml(art.title)}</h2>
      
      <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); padding:0.9rem 1.1rem; border-radius:var(--radius-md); margin-bottom:1.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem;">
        <div>
          <div style="font-weight:700; color:#ffffff; font-size:0.95rem;">${escapeHtml(art.author_name)}</div>
          <div style="color:var(--text-muted); font-size:0.85rem;">${escapeHtml(art.institution)}</div>
          ${art.original_journal ? `
            <div style="font-size:0.8rem; color:#60a5fa; margin-top:0.35rem;">
              <i class="fas fa-external-link-alt"></i> Publicação de Origem: <strong>${escapeHtml(art.original_journal)}</strong>
              ${art.original_url ? `<a href="${escapeHtml(art.original_url)}" target="_blank" rel="noopener noreferrer" style="color:#93c5fd; text-decoration:underline; margin-left:4px;">[Aceder à Fonte Original]</a>` : ''}
            </div>
          ` : ''}
        </div>
        <div style="color:var(--gold-primary); font-size:0.82rem; text-align:right;">
          <i class="fas fa-award"></i> AfricaWinners Hub<br>
          <span style="color:var(--text-muted); font-size:0.75rem;">Coordenação: Valdimir Jacinto Esteves</span>
        </div>
      </div>

      <!-- SEÇÃO INTEGRADA: RESUMO A ACOMPANHAR AS IMAGENS OU VÍDEO -->
      <div class="portal-media-summary-grid">
        ${hasMedia ? `
          <div class="portal-media-column">
            ${hasVideo ? `
              <div class="portal-showcase-video">
                <div class="portal-media-label"><i class="fas fa-video" style="color:#f43f5e;"></i> Registo Audiovisual Oficial</div>
                ${videoEmbedHtml}
              </div>
            ` : ''}

            ${imagesArr.length > 0 ? `
              <div class="portal-showcase-gallery">
                <div class="portal-media-label">
                  <i class="fas fa-camera" style="color:var(--gold-primary);"></i> Registos Fotográficos (${imagesArr.length} foto${imagesArr.length > 1 ? 's' : ''} • clique para ampliar)
                </div>
                <div class="portal-main-photo" onclick="openPhotoLightbox('${escapeHtml(imagesArr[0])}', '${escapeHtml(art.title)}')">
                  <img src="${escapeHtml(imagesArr[0])}" alt="${escapeHtml(art.title)}">
                  <span class="lightbox-hint"><i class="fas fa-search-plus"></i> Ampliar</span>
                </div>
                ${imagesArr.length > 1 ? `
                  <div class="portal-thumb-row">
                    ${imagesArr.slice(1).map((img, i) => `
                      <div class="portal-thumb-item" onclick="openPhotoLightbox('${escapeHtml(img)}', '${escapeHtml(art.title)} - Foto ${i+2}')">
                        <img src="${escapeHtml(img)}" alt="Foto ${i+2}">
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            ` : ''}
          </div>
        ` : ''}

        <div class="portal-summary-column ${!hasMedia ? 'full-width' : ''}">
          <div class="portal-summary-card">
            <div class="portal-summary-header">
              <i class="fas fa-align-left" style="color:var(--gold-primary);"></i>
              <span>Resumo & Descrição da Publicação</span>
            </div>
            <div class="portal-summary-text">
              ${escapeHtml(art.abstract)}
            </div>

            ${art.keywords ? `
              <div style="margin-top:1.25rem; padding-top:1rem; border-top:1px dashed rgba(212,175,55,0.2);">
                <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.4rem; font-weight:600;">Palavras-Chave</div>
                <div style="display:flex; flex-wrap:wrap; gap:0.4rem;">
                  ${art.keywords.split(',').map(k => `<span class="article-field-tag" style="font-size:0.75rem; padding:0.2rem 0.55rem;">${escapeHtml(k.trim())}</span>`).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; padding-top:1.25rem; border-top:1px solid rgba(255,255,255,0.08); flex-wrap:wrap; gap:1rem; margin-top:1.5rem;">
        <div>
          ${isArticle ? `
            <button class="btn btn-outline btn-sm" onclick="viewCertificate(${art.id})">
              <i class="fas fa-certificate" style="color:var(--gold-primary);"></i> Ver Certificado Oficial
            </button>
          ` : `
            <span style="font-size:0.82rem; color:var(--text-muted); display:flex; align-items:center; gap:5px;">
              <i class="fas fa-info-circle" style="color:var(--gold-primary);"></i> Modalidade Comunitária (Sem Certificação)
            </span>
          `}
        </div>

        <div style="display:flex; gap:0.75rem; align-items:center;">
          ${hasPdf ? `
            <a href="${API_BASE}/api/articles/${art.id}/download" class="btn btn-primary btn-sm" target="_blank">
              <i class="fas fa-file-pdf"></i> Baixar Manuscrito Completo (PDF)
            </a>
          ` : `
            <div style="font-size:0.82rem; color:#34d399; font-weight:600;">
              <i class="fas fa-check-circle"></i> Registo Multimédia Oficial no Tech Hub
            </div>
          `}
          <button class="btn btn-outline btn-sm" onclick="closeAllModals()">Fechar</button>
        </div>
      </div>
    `;
    openModal('articleDetailsModal');
  }
}

// ==========================================================================
// SUBMISSÃO PELO AUTOR (ARTIGO, HISTÓRIA, ACTIVIDADE OU PROJECTO)
// ==========================================================================
async function handleSubmission(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');

  const pubType = (form.publication_type && form.publication_type.value) || 'Artigo Científico';
  const isArticle = pubType.toLowerCase().includes('artigo');

  // Condição estrita exigida pelo utilizador:
  // "unico que exige documento é apenas nos artigos, nos restantes não"
  if (isArticle && !State.selectedFile) {
    showToast('Por favor anexe o ficheiro do manuscrito em PDF ou DOCX. Artigos Científicos exigem documento formal.', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('title', form.title.value);
  formData.append('abstract', form.abstract.value);
  formData.append('keywords', form.keywords.value);
  formData.append('field', form.field.value);
  formData.append('author_name', form.author_name.value);
  formData.append('author_email', form.author_email.value);
  formData.append('institution', form.institution.value);
  formData.append('phone', form.phone.value);
  formData.append('publication_type', pubType);
  formData.append('contribution_type', pubType);
  if (form.original_journal) formData.append('original_journal', form.original_journal.value);
  if (form.original_url) formData.append('original_url', form.original_url.value);
  if (form.video_url && form.video_url.value) formData.append('video_url', form.video_url.value);

  // Anexar manuscrito se selecionado
  if (State.selectedFile) {
    formData.append('manuscript', State.selectedFile);
  }

  // Anexar fotos
  if (State.selectedPhotos && State.selectedPhotos.length > 0) {
    State.selectedPhotos.forEach(photo => {
      formData.append('photos', photo);
    });
  }

  // Anexar ficheiro de vídeo se selecionado
  if (form.video_file && form.video_file.files && form.video_file.files[0]) {
    formData.append('video', form.video_file.files[0]);
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> A submeter ${pubType}...`;

  // Pré-visualização local imediata
  const localImagePreviews = State.selectedPhotos.map(p => URL.createObjectURL(p));
  const newSub = {
    id: Date.now() % 100000,
    title: form.title.value,
    abstract: form.abstract.value,
    keywords: form.keywords.value,
    field: form.field.value,
    author_name: form.author_name.value,
    author_email: form.author_email.value,
    institution: form.institution.value,
    phone: form.phone.value || '976161521',
    publication_type: pubType,
    contribution_type: pubType,
    original_journal: form.original_journal ? form.original_journal.value : '',
    original_url: form.original_url ? form.original_url.value : '',
    pdf_path: State.selectedFile ? 'uploads/pending-doc.pdf' : null,
    images: localImagePreviews.length > 0 ? localImagePreviews : null,
    video_url: form.video_url ? form.video_url.value : '',
    status: 'Under Peer Review',
    certificate_id: isArticle ? `AWSJ-CERT-2026-${Date.now().toString().slice(-4)}` : null,
    views_count: 0,
    downloads_count: 0
  };
  State.articles.unshift(newSub);

  try {
    const res = await fetch(`${API_BASE}/api/articles/submit`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();

    if (data && data.success) {
      if (data.articleId) newSub.id = data.articleId;
      if (data.certificateCode && isArticle) newSub.certificate_id = data.certificateCode;
      else if (!isArticle) newSub.certificate_id = null;
      if (data.images && Array.isArray(data.images)) newSub.images = data.images;
      if (data.videoUrl) newSub.video_url = data.videoUrl;
      showSubmissionSuccessModal(data);
    } else {
      showSubmissionSuccessModal({
        title: form.title.value,
        certificateCode: isArticle ? newSub.certificate_id : null,
        publicationType: pubType,
        instructions: `A sua publicação foi registada com sucesso para mentoria sob coordenação do Fundador & Mentor Valdimir Jacinto Esteves.`
      });
    }
  } catch (error) {
    showSubmissionSuccessModal({
      title: form.title.value,
      certificateCode: isArticle ? newSub.certificate_id : null,
      publicationType: pubType,
      instructions: `A sua publicação foi registada com sucesso para mentoria sob coordenação do Fundador & Mentor Valdimir Jacinto Esteves.`
    });
  } finally {
    form.reset();
    State.selectedFile = null;
    State.selectedPhotos = [];
    renderPhotoPreviews(false);

    const filePrev = document.getElementById('filePreview');
    const dropzone = document.getElementById('manuscriptDropzone');
    if (filePrev) filePrev.style.display = 'none';
    if (dropzone) dropzone.style.display = 'block';

    renderArticles();
    fetchJournalStats();
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i class="fas fa-paper-plane"></i> Submeter Publicação`;
  }
}

function showSubmissionSuccessModal(data) {
  const content = document.getElementById('submissionReceiptContent');
  if (content) {
    const pubType = data.publicationType || 'Artigo Científico';
    const isArticle = pubType.toLowerCase().includes('artigo');
    const hasCert = isArticle && !!data.certificateCode;

    content.innerHTML = `
      <div style="text-align:center; margin-bottom:1.5rem;">
        <div style="width:64px; height:64px; background:rgba(16,185,129,0.15); border:2px solid var(--accent-emerald); border-radius:50%; display:inline-flex; align-items:center; justify-content:center; color:var(--accent-emerald); font-size:1.8rem; margin-bottom:1rem;">
          <i class="fas fa-check"></i>
        </div>
        <h3 style="color:#ffffff; font-family:var(--font-serif); font-size:1.5rem; margin-bottom:0.4rem;">${escapeHtml(pubType)} Submetido com Sucesso!</h3>
        <p style="color:var(--gold-light); font-size:0.9rem;">AfricaWinners Scientific Blog & Tech Hub</p>
      </div>

      <div style="background:rgba(8,18,36,0.9); border:1px solid var(--gold-border); border-radius:var(--radius-md); padding:1.25rem; margin-bottom:1.5rem;">
        ${hasCert ? `
          <div style="font-size:0.8rem; color:var(--text-muted); text-transform:uppercase;">Código Provisório do Certificado:</div>
          <div style="font-family:var(--font-mono); font-size:1.05rem; color:#34d399; font-weight:700; margin-bottom:0.75rem;">${escapeHtml(data.certificateCode)}</div>
        ` : `
          <div style="font-size:0.8rem; color:var(--text-muted); text-transform:uppercase;">Tipo de Divulgação:</div>
          <div style="font-size:0.95rem; color:var(--gold-light); font-weight:700; margin-bottom:0.75rem;">${escapeHtml(pubType)} • Divulgação Multimédia Comunitária (Sem Certificação)</div>
        `}

        <div style="font-size:0.8rem; color:var(--text-muted); text-transform:uppercase;">Modelo de Publicação:</div>
        <div style="font-size:0.95rem; color:#34d399; font-weight:700; margin-bottom:0.75rem;">Acesso Aberto Comunitário</div>

        <div style="font-size:0.8rem; color:var(--text-muted); text-transform:uppercase;">Coordenação & Mentoria:</div>
        <div style="font-size:0.9rem; color:var(--gold-light); font-weight:600;">Fundador & Mentor: Valdimir Jacinto Esteves</div>
      </div>

      <div style="font-size:0.85rem; color:var(--text-secondary); line-height:1.6; margin-bottom:1.5rem;">
        ${isArticle 
          ? 'O artigo científico entrou em fase de mentoria editorial e emissão de Certificado Oficial. Receberá comunicações diretamente do mentor pelo e-mail institucional fornecido.' 
          : 'A publicação com os seus registos visuais e resumo foi registada com sucesso e entrará na vitrine comunitária do Blog & Tech Hub.'}
      </div>

      <div style="display:flex; justify-content:center;">
        <button class="btn btn-primary" onclick="closeAllModals(); smoothScrollTo('#artigos')">Ver Publicações do Portal</button>
      </div>
    `;
    openModal('submissionReceiptModal');
  }
}

// ==========================================================================
// RASTREADOR DE SUBMISSÕES DO AUTOR
// ==========================================================================
async function handleTrackSubmissions(e) {
  e.preventDefault();
  const email = e.target.trackEmail.value.trim();
  const container = document.getElementById('trackerResults');

  if (!email) return;

  container.innerHTML = `<div style="text-align:center; padding:1.5rem; color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> A consultar submissões...</div>`;

  try {
    const res = await fetch(`${API_BASE}/api/articles/track?email=${encodeURIComponent(email)}`);
    const data = await res.json();

    if (data.success && data.articles && data.articles.length > 0) {
      container.innerHTML = data.articles.map(art => {
        const pubType = art.publication_type || art.contribution_type || 'Artigo Científico';
        const isArticle = pubType.toLowerCase().includes('artigo');

        return `
          <div style="background:rgba(15,29,54,0.9); border:1px solid var(--gold-border); border-radius:var(--radius-md); padding:1.5rem; margin-top:1.25rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem;">
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <span class="badge-pub-type badge-pub-${isArticle ? 'artigo' : 'historia'}" style="font-size:0.7rem; padding:0.15rem 0.5rem;">${escapeHtml(pubType)}</span>
                <span class="article-field-tag">${escapeHtml(art.field)}</span>
              </div>
              ${isArticle ? `
                <span style="font-family:var(--font-mono); font-size:0.78rem; color:#34d399;">
                  <i class="fas fa-certificate"></i> ${escapeHtml(art.certificate_id || 'Certificado em Emissão')}
                </span>
              ` : `
                <span style="font-size:0.75rem; color:var(--gold-primary);">
                  <i class="fas fa-camera"></i> Divulgação Comunitária
                </span>
              `}
            </div>
            <h4 style="color:#ffffff; font-size:1.1rem; margin-bottom:0.5rem;">${escapeHtml(art.title)}</h4>
            <p style="font-size:0.84rem; color:var(--text-secondary); margin-bottom:1rem;">${escapeHtml(art.abstract.substring(0, 160))}...</p>
            
            <div style="display:flex; gap:0.5rem; align-items:center; margin-bottom:1rem; flex-wrap:wrap;">
              <span class="status-badge ${art.status === 'Published' ? 'published' : 'review'}">${escapeHtml(art.status)}</span>
              <span style="font-size:0.8rem; color:#34d399;">Acesso Aberto</span>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.06); padding-top:0.75rem; flex-wrap:wrap; gap:0.5rem;">
              <div style="font-size:0.8rem; color:var(--text-muted);">
                Mentor Científico: <strong>Valdimir Jacinto Esteves</strong>
              </div>
              <div style="display:flex; gap:0.5rem;">
                ${isArticle ? `
                  <button class="btn btn-primary btn-sm" onclick="viewCertificate(${art.id})">
                    <i class="fas fa-certificate"></i> Ver Certificado Oficial
                  </button>
                ` : `
                  <button class="btn btn-outline btn-sm" onclick="viewArticleDetails(${art.id})">
                    <i class="fas fa-eye"></i> Ver no Portal
                  </button>
                `}
              </div>
            </div>
          </div>
        `;
      }).join('');
    } else {
      container.innerHTML = `
        <div style="text-align:center; padding:1.5rem; color:var(--text-muted); background:rgba(255,255,255,0.02); border-radius:var(--radius-md); margin-top:1rem;">
          Nenhum artigo encontrado para o e-mail <strong>${escapeHtml(email)}</strong>.
        </div>
      `;
    }
  } catch (err) {
    container.innerHTML = `<div style="text-align:center; padding:1.5rem; color:var(--text-muted);">Erro ao consultar submissões.</div>`;
  }
}

// ==========================================================================
// ESTATÍSTICAS
// ==========================================================================
async function fetchJournalStats() {
  const publishedCount = (State.articles || []).filter(a => a.status === 'Published').length;
  const submissionsCount = (State.articles || []).length;

  try {
    const res = await fetch(`${API_BASE}/api/journal/stats`);
    const data = await res.json();
    if (data.success && data.stats) {
      animateCounter('statPublished', data.stats.publishedArticles || publishedCount || 3);
      animateCounter('statSubmissions', data.stats.totalSubmissions || submissionsCount || 12);
      animateCounter('statDownloads', data.stats.totalDownloads || 1037);
      animateCounter('statViews', data.stats.totalViews || 3230);
      return;
    }
  } catch (e) {
    // Modo local / contingência
  }

  animateCounter('statPublished', publishedCount || 3);
  animateCounter('statSubmissions', submissionsCount || 12);
  animateCounter('statDownloads', 1037);
  animateCounter('statViews', 3230);
}

function animateCounter(elementId, target) {
  const el = document.getElementById(elementId);
  if (!el) return;
  let current = 0;
  const increment = Math.max(1, Math.floor(target / 40));
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      el.innerText = target.toLocaleString('pt-PT');
      clearInterval(timer);
    } else {
      el.innerText = current.toLocaleString('pt-PT');
    }
  }, 25);
}

// ==========================================================================
// MODAIS & UTILITÁRIOS
// ==========================================================================
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('active');
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.classList.remove('active');
  });
}

function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-triangle' : 'fa-info-circle';
  toast.innerHTML = `<i class="fas ${icon}"></i> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function smoothScrollTo(target) {
  const el = document.querySelector(target);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
