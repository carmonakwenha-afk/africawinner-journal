import os, re

persistence_and_sync = """// ==========================================================================
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
"""

render_articles_code = """function renderArticles() {
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
  }"""

delete_article_code = """async function deleteArticle(articleId) {
  if (!articleId) return;
  const idStr = String(articleId);
  const art = (State.articles || []).find(a => String(a.id) === idStr);
  const title = art ? art.title : `Publicação #${articleId}`;
  if (!confirm(`Tem a certeza que deseja eliminar permanentemente a publicação #${articleId} ("${title}")?\\n\\nEsta publicação será excluída definitivamente da nuvem e NUNCA mais voltará a aparecer.`)) {
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
  if (!confirm('Deseja eliminar todas as publicações não aprovadas ou artigos de demonstração anteriores (IDs 1, 2, 3, 4)?\\n\\nApenas as publicações reais aprovadas pelo administrador serão mantidas.')) {
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
}"""

admin_edit_functions = """
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
"""

def update_file(p):
    with open(p, 'r', encoding='utf-8') as f: content = f.read()
    
    # 1. Substituir bloco superior de persistência
    content = re.sub(r'function\s+getSavedArticles\b[\s\S]*?(?=const\s+defaultPartnersData\b)', persistence_and_sync + '\n', content, count=1)
    
    # 2. Atualizar renderArticles
    content = re.sub(r'function\s+renderArticles\s*\(\)\s*\{[\s\S]*?(?=grid\.innerHTML\s*=\s*filtered\.map)', render_articles_code + '\n\n  grid.innerHTML = filtered.map', content, count=1)
    
    # 3. Atualizar deleteArticle
    content = re.sub(r'async\s+function\s+deleteArticle\s*\([^)]*\)\s*\{[\s\S]*?(?=\/\/ Manipular Publicação Direta|\/\/ =+\s*\/\/\s*GESTÃO DINÂMICA|async\s+function\s+handleAdminDirectPublish)', delete_article_code + '\n\n', content, count=1)
    
    # 4. Injetar openEditArticleModal se necessário
    if 'function openEditArticleModal' not in content:
        content = content.replace('function renderAdminArticlesList(articles, container) {', admin_edit_functions + '\nfunction renderAdminArticlesList(articles, container) {')
        
    with open(p, 'w', encoding='utf-8') as f: f.write(content)
    print(f'✅ JS Atualizado: {p}')

def update_html(p):
    with open(p, 'r', encoding='utf-8') as f: content = f.read()
    purge_btn = """        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem; background:rgba(217,119,6,0.08); padding:0.65rem 1rem; border-radius:var(--radius-sm); border:1px solid rgba(217,119,6,0.25);">
          <div style="font-size:0.83rem; color:var(--text-main);">
            <i class="fas fa-shield-alt" style="color:var(--gold-primary); margin-right:4px;"></i> Apenas publicações com estado <strong>"Publicado"</strong> aparecem na área pública. Itens eliminados nunca mais retornam.
          </div>
          <button type="button" class="btn btn-outline btn-sm" onclick="purgeUnwantedArticles()" style="color:#ef4444; border-color:rgba(239,68,68,0.5); font-size:0.75rem; padding:0.35rem 0.75rem;">
            <i class="fas fa-trash-alt"></i> Limpar Artigos de Teste / Não Solicitados
          </button>
        </div>

        <div class="admin-table-container">"""
    if 'purgeUnwantedArticles()' not in content:
        content = content.replace('<div class="admin-table-container">', purge_btn)
    content = re.sub(r'src="js/app\.js(\?[^"]*)?"', 'src="js/app.js?v=20261010_admin_strict"', content)
    with open(p, 'w', encoding='utf-8') as f: f.write(content)
    print(f'✅ HTML Atualizado: {p}')

for root, dirs, files in os.walk('.'):
    if '.git' in dirs: dirs.remove('.git')
    if 'node_modules' in dirs: dirs.remove('node_modules')
    for f in files:
        if f == 'app.js' and 'public' in root: update_file(os.path.join(root, f))
        elif f == 'index.html' and 'public' in root: update_html(os.path.join(root, f))
print('Migração de controle rigoroso concluída!')
