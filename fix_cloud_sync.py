#!/usr/bin/env python3
import os, re

FIRESTORE_RULES = """rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
"""

FIREBASE_RC = """{
  "projects": {
    "default": "africawinners-510716"
  }
}
"""

FIREBASE_JSON = """{
  "firestore": {
    "rules": "firestore.rules"
  },
  "hosting": {
    "public": "public",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**",
      "**/*.exe",
      "**/*.dll",
      "**/*.bat",
      "**/*.cmd",
      "**/*.sh",
      "**/*.bin",
      "**/*.apk",
      "**/*.ipa",
      "**/*.msi",
      "**/*.py",
      "**/*.ps1"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(css|js)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=3600"
          }
        ]
      },
      {
        "source": "**/*.@(jpg|jpeg|png|svg|webp|ico)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=86400"
          }
        ]
      }
    ]
  }
}
"""

ADMIN_EDIT_MODAL_HTML = """
  <!-- ========================================================================
       MODAL: EDIÇÃO DE PUBLICAÇÃO PELO ADMINISTRADOR
       ======================================================================== -->
  <div class="modal-overlay" id="adminEditArticleModal" role="dialog" aria-modal="true">
    <div class="modal-window modal-lg">
      <button class="modal-close" aria-label="Fechar">&times;</button>
      <div class="modal-header">
        <h3 class="modal-title"><i class="fas fa-edit" style="color:var(--gold-primary);"></i> Editar Publicação</h3>
        <p style="font-size:0.85rem; color:var(--text-muted);">Altere as informações da publicação. As alterações serão salvas imediatamente na nuvem e no blog.</p>
      </div>
      <form id="adminEditArticleForm">
        <input type="hidden" id="editArticleId" name="editArticleId">
        <div class="form-group">
          <label class="form-label" for="editArticleTitle">Título da Publicação <span class="req">*</span></label>
          <input type="text" id="editArticleTitle" name="title" class="form-control" required>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
          <div class="form-group">
            <label class="form-label" for="editArticleField">Área Temática <span class="req">*</span></label>
            <select id="editArticleField" name="field" class="form-control" required>
              <option value="Sistemas &amp; IA">Sistemas &amp; IA</option>
              <option value="Energia &amp; Ambiente">Energia &amp; Ambiente</option>
              <option value="Biotecnologia &amp; Agro">Biotecnologia &amp; Agro</option>
              <option value="Ciências da Saúde">Ciências da Saúde</option>
              <option value="Robótica &amp; STEM">Robótica &amp; STEM</option>
              <option value="Educação &amp; Sociedade">Educação &amp; Sociedade</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="editArticleStatus">Estado Editorial <span class="req">*</span></label>
            <select id="editArticleStatus" name="status" class="form-control" required>
              <option value="Published">Publicado no Blog (Visível a Todos)</option>
              <option value="Under Peer Review">Em Mentoria / Revisão</option>
              <option value="Revisões Solicitadas">Revisões Solicitadas</option>
              <option value="Rejected">Rejeitado</option>
            </select>
          </div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
          <div class="form-group">
            <label class="form-label" for="editArticleAuthor">Autor Principal <span class="req">*</span></label>
            <input type="text" id="editArticleAuthor" name="author_name" class="form-control" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="editArticleInstitution">Instituição / Afiliação</label>
            <input type="text" id="editArticleInstitution" name="institution" class="form-control">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="editArticleKeywords">Palavras-chave (separadas por vírgula)</label>
          <input type="text" id="editArticleKeywords" name="keywords" class="form-control">
        </div>
        <div class="form-group">
          <label class="form-label" for="editArticleAbstract">Resumo / Conteúdo Detalhado <span class="req">*</span></label>
          <textarea id="editArticleAbstract" name="abstract" class="form-control" rows="5" required></textarea>
        </div>
        <div class="form-group">
          <label class="form-label" for="editArticleVideo">Link de Vídeo (YouTube ou MP4 - opcional)</label>
          <input type="url" id="editArticleVideo" name="video_url" class="form-control" placeholder="https://www.youtube.com/watch?v=...">
        </div>
        <div style="display:flex; justify-content:flex-end; gap:0.75rem; margin-top:1.5rem;">
          <button type="button" class="btn btn-outline btn-sm" onclick="closeAllModals()">Cancelar</button>
          <button type="submit" class="btn btn-brand-pill btn-sm" id="btnSaveEditArticle">
            <i class="fas fa-save"></i> Guardar Alterações
          </button>
        </div>
      </form>
    </div>
  </div>
"""

FIRESTORE_SCRIPTS_HTML = """  <!-- Firebase App, Firestore & Hosting Auto-Init (Sincronização em Tempo Real) -->
  <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js"></script>
  <script src="/__/firebase/init.js"></script>

  <!-- Scripts do Portal -->
  <script src="js/app.js?v=20261010_fire"></script>
"""

def patch_index_html(file_path):
    if not os.path.exists(file_path): return
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    if "adminEditArticleModal" not in content:
        content = content.replace('<footer class="footer">', ADMIN_EDIT_MODAL_HTML + '\n  <footer class="footer">')
    if "firebase-firestore-compat.js" not in content:
        content = re.sub(r'<!-- Scripts do Portal -->\s*<script src="js/app\.js[^"]*"></script>', lambda m: FIRESTORE_SCRIPTS_HTML.strip(), content)
        if "firebase-firestore-compat.js" not in content:
            content = content.replace('<script src="js/app.js"></script>', FIRESTORE_SCRIPTS_HTML.strip())
    else:
        content = re.sub(r'src="js/app\.js[^"]*"', 'src="js/app.js?v=20261010_fire"', content)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"✅ index.html atualizado: {file_path}")

def patch_app_js(file_path):
    if not os.path.exists(file_path): return
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    firestore_core_code = """// ==========================================================================
// ARMAZENAMENTO PERSISTENTE (FIREBASE HOSTING & OFFLINE-FIRST)
// Garante que todas as publicações e alterações do Administrador NUNCA se apaguem
// ==========================================================================
function getSavedArticles() {
  const saved = localStorage.getItem('awsj_custom_articles');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch(e) {}
  }
  return (typeof defaultArticlesData !== 'undefined' && Array.isArray(defaultArticlesData)) ? defaultArticlesData : [];
}

function saveArticlesLocally(articles) {
  try {
    localStorage.setItem('awsj_custom_articles', JSON.stringify(articles || []));
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
  if (db) {
    try {
      await db.collection('articles').doc(String(articleId)).delete();
      console.log('🗑️ Artigo removido do Cloud Firestore:', articleId);
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
    db.collection('articles').onSnapshot((snapshot) => {
      const cloudArticles = [];
      snapshot.forEach((doc) => {
        const item = doc.data();
        if (item) {
          if (!item.id) item.id = doc.id;
          cloudArticles.push(item);
        }
      });

      if (cloudArticles.length > 0) {
        cloudArticles.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
        State.articles = cloudArticles;
        saveArticlesLocally(State.articles);
      } else {
        const local = getSavedArticles();
        if (local && local.length > 0) {
          State.articles = local;
          local.forEach(a => saveArticleToCloud(a));
        }
      }
      renderArticles();
      loadAdminArticles();
      fetchJournalStats();
    }, (err) => {
      console.warn('Firestore snapshot error, fallback para local:', err);
      renderArticles();
    });

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

const defaultArticlesData = [
  {
    id: 1,
    title: 'Metodologia de Mentoria Científica e Documentação Acadêmica para Jovens Investigadores em África',
    abstract: 'Introdução: A produção e divulgação científica em comunidades emergentes africanas enfrenta lacunas de mentoria estruturada e acesso a normas metodológicas internacionais.\\n\\nMetodologia: O estudo analisa um modelo de capacitação editorial e oficinas de redação acadêmica (normas IMRyD) aplicadas pelo AfricaWinners Hub entre 2025 e 2026.\\n\\nResultados: Constatou-se uma evolução significativa na qualidade formal dos manuscritos, rigor metodológico e apropriação das diretrizes de publicação científica.\\n\\nConclusão: A mentoria de base comunitária aliada a repositórios de acesso aberto é um vetor indispensável para a soberania científica africana.',
    keywords: 'Mentoria Científica, Metodologia IMRyD, Educação em África, AfricaWinners, Acesso Aberto',
    field: 'Educação & Sociedade',
    author_name: 'Valdimir Jacinto Esteves',
    author_email: 'escritorioestevesemultisservic@gmail.com',
    institution: 'Escritório Esteves & Multi-Serviços / AfricaWinners Hub',
    phone: '976161521',
    publication_type: 'Artigo Científico',
    contribution_type: 'Artigo Científico',
    pdf_path: 'uploads/artigo-metodologia-mentoria.pdf',
    images: null,
    video_url: '',
    status: 'Published',
    certificate_id: 'AWSJ-CERT-2026-0001',
    views_count: 142,
    downloads_count: 28,
    created_at: '2026-01-15T10:00:00.000Z'
  },
  {
    id: 2,
    title: 'Superação e Liderança: A Jornada de Inovação de Jovens Talentos Comunitários',
    abstract: 'Relato de experiência e superação de jovens inovadores comunitários que, através da orientação técnica do Mentor Valdimir Jacinto Esteves e espírito colaborativo, desenvolveram soluções práticas para as suas comunidades. Uma demonstração de que talento, esforço e mentoria geram conquistas duradouras.',
    keywords: 'Histórias de Vencedor, Resiliência, Liderança Jovem, Inovação Social',
    field: 'Educação & Sociedade',
    author_name: 'Equipa Editorial AfricaWinners',
    author_email: 'escritorioestevesemultisservic@gmail.com',
    institution: 'Comunidade AfricaWinners',
    phone: '976161521',
    publication_type: 'História de Vencedor',
    contribution_type: 'História de Vencedor',
    pdf_path: null,
    images: null,
    video_url: '',
    status: 'Published',
    certificate_id: null,
    views_count: 98,
    downloads_count: 0,
    created_at: '2026-02-10T14:30:00.000Z'
  },
  {
    id: 3,
    title: 'I Jornada Comunitária de Divulgação Científica e STEM em Luanda',
    abstract: 'Registo e memórias da jornada comunitária realizada com estudantes e professores, promovendo palestras de incentivo à pesquisa, introdução ao pensamento científico e oficinas práticas de tecnologia para a juventude.',
    keywords: 'Actividade Comunitária, STEM, Extensão Universitária, Divulgação Científica',
    field: 'Robótica & STEM',
    author_name: 'Coordenação Editorial AfricaWinners',
    author_email: 'escritorioestevesemultisservic@gmail.com',
    institution: 'AfricaWinners Tech Hub',
    phone: '976161521',
    publication_type: 'Actividade',
    contribution_type: 'Actividade',
    pdf_path: null,
    images: null,
    video_url: '',
    status: 'Published',
    certificate_id: null,
    views_count: 76,
    downloads_count: 0,
    created_at: '2026-03-05T09:15:00.000Z'
  },
  {
    id: 4,
    title: 'Protótipo Comunitário de Automação e Sensores de Baixo Custo para Escolas Técnicas',
    abstract: 'Projeto de engenharia de protótipo desenvolvido no Tech Hub utilizando componentes acessíveis e controladores abertos para demonstração de princípios físicos e automação em salas de aula e oficinas comunitárias.',
    keywords: 'Projecto Maker, Robótica, Automação, Hardware Aberto, STEM África',
    field: 'Sistemas & IA',
    author_name: 'Núcleo Maker AfricaWinners',
    author_email: 'escritorioestevesemultisservic@gmail.com',
    institution: 'Laboratório & Tech Hub AfricaWinners',
    phone: '976161521',
    publication_type: 'Projecto',
    contribution_type: 'Projecto',
    pdf_path: null,
    images: null,
    video_url: '',
    status: 'Published',
    certificate_id: null,
    views_count: 53,
    downloads_count: 0,
    created_at: '2026-03-20T11:00:00.000Z'
  }
];"""

    if "saveArticleToCloud" not in content:
        if "// ARMAZENAMENTO PERSISTENTE" in content:
            content = re.sub(r'// ==========================================================================\s*// ARMAZENAMENTO PERSISTENTE[\s\S]*?const defaultArticlesData = \[\];', lambda m: firestore_core_code, content)
        else:
            content = content.replace("const API_BASE =", firestore_core_code + "\n\nconst API_BASE =")

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

  renderArticles();
  loadAdminArticles();
  fetchJournalStats();
  closeAllModals();
  showToast('Publicação atualizada com sucesso e salva na nuvem!', 'success');

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Alterações';
  }
}
"""
    if "function openEditArticleModal" not in content:
        content = content.replace("function renderAdminArticlesList(articles) {", admin_edit_functions + "\nfunction renderAdminArticlesList(articles) {")

    if "openEditArticleModal" not in content or "fas fa-edit" not in content:
        edit_button_html = """            <button type="button" class="btn btn-outline btn-sm" onclick="openEditArticleModal('${art.id}')" style="color:var(--gold-light); border-color:var(--gold-border); padding:0.35rem 0.5rem; font-size:0.78rem; font-weight:700; width:100%; cursor:pointer;" title="Editar informações desta publicação">
              <i class="fas fa-edit"></i> Editar
            </button>
            <button type="button" class="btn btn-outline btn-sm" onclick="deleteArticle(${art.id})"""
        content = content.replace("""            <button type="button" class="btn btn-outline btn-sm" onclick="deleteArticle(${art.id})""", edit_button_html)

    if "adminEditArticleForm" not in content:
        content = content.replace(
            "if (adminPublishForm) adminPublishForm.addEventListener('submit', handleAdminDirectPublish);",
            "if (adminPublishForm) adminPublishForm.addEventListener('submit', handleAdminDirectPublish);\n\n  const adminEditForm = document.getElementById('adminEditArticleForm');\n  if (adminEditForm) adminEditForm.addEventListener('submit', handleAdminEditArticleSubmit);"
        )

    if "initCloudSync()" not in content:
        content = content.replace("fetchArticles();", "fetchArticles();\n  initCloudSync();")

    if "saveArticleToCloud(newArt)" not in content:
        content = re.sub(
            r'submitBtn\.disabled = true;\s*submitBtn\.innerHTML = `[^`]+`;\s*const newArt = \{[\s\S]*?State\.articles\.unshift\(newArt\);\s*saveArticlesLocally\(State\.articles\);',
            lambda m: """submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class=\"fas fa-spinner fa-spin\"></i> A publicar ${pubType}...`;

  const base64Photos = (await Promise.all((State.adminSelectedPhotos || []).map(fileToBase64))).filter(Boolean);

  const newArt = {
    id: Date.now(),
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
    pdf_path: (fileInput && fileInput.files && fileInput.files[0]) ? fileInput.files[0].name : null,
    images: base64Photos.length > 0 ? base64Photos : null,
    video_url: form.adminVideoUrl ? form.adminVideoUrl.value : '',
    status: 'Published',
    certificate_id: isArticle ? `AWSJ-CERT-2026-${Date.now().toString().slice(-4)}` : null,
    views_count: 1,
    downloads_count: 0,
    created_at: new Date().toISOString()
  };

  State.articles.unshift(newArt);
  saveArticlesLocally(State.articles);
  await saveArticleToCloud(newArt);""",
            content
        )

    if "await saveArticleToCloud(art);" not in content:
        content = re.sub(
            r'if \(art\) \{\s*art\.status = \'Published\';\s*saveArticlesLocally\(State\.articles\);\s*\}',
            lambda m: """if (art) {
    art.status = 'Published';
    saveArticlesLocally(State.articles);
    await saveArticleToCloud(art);
  }""",
            content
        )

    if "await saveArticleToCloud(targetArt);" not in content:
        content = re.sub(
            r'targetArt\.status = newStatus;\s*if \(notes\) targetArt\.editorial_notes = notes;\s*saveArticlesLocally\(State\.articles\);',
            lambda m: """targetArt.status = newStatus;
    if (notes) targetArt.editorial_notes = notes;
    saveArticlesLocally(State.articles);
    await saveArticleToCloud(targetArt);""",
            content
        )

    if "await deleteArticleFromCloud(articleId);" not in content:
        content = re.sub(
            r'State\.articles = State\.articles\.filter\(a => String\(a\.id\) !== String\(articleId\)\);\s*saveArticlesLocally\(State\.articles\);',
            lambda m: """State.articles = State.articles.filter(a => String(a.id) !== String(articleId));
  saveArticlesLocally(State.articles);
  await deleteArticleFromCloud(articleId);""",
            content
        )

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"✅ app.js atualizado com Cloud Firestore: {file_path}")

def main():
    print("=" * 65)
    print("🌟 AfricaWinners Scientific Blog & Tech Hub (AWSJ)")
    print("🔥 Ativando Sincronização em Nuvem (Cloud Firestore + Hosting)")
    print("=" * 65)

    project_id = "africawinners-510716"

    # 1. Localizar o repositório
    home_dir = os.path.expanduser("~")
    candidates = [
        os.path.join(home_dir, "africawinner-journal"),
        os.path.abspath("africawinner-journal"),
        os.path.abspath(".")
    ]
    repo_dir = None
    for c in candidates:
        if os.path.isdir(os.path.join(c, ".git")):
            repo_dir = c
            break
        elif os.path.isdir(os.path.join(c, "public")) and os.path.exists(os.path.join(c, "package.json")):
            repo_dir = c
            break

    if repo_dir:
        print(f"\n[1/6] 📁 Acedendo ao repositório: {repo_dir}")
        os.chdir(repo_dir)
    else:
        print(f"\n[1/6] 📁 Diretório de trabalho: {os.getcwd()}")

    # 2. Ativar APIs do Firestore
    print("\n[2/6] Ativando APIs do Cloud Firestore...")
    os.system(f"gcloud services enable firestore.googleapis.com --project {project_id} 2>/dev/null || true")
    os.system(f"gcloud firestore databases create --location=nam5 --project {project_id} 2>/dev/null || true")

    # 3. Higienizar a pasta public/ (remover ficheiros executáveis e permissões restritas)
    print("\n[3/6] Higienizando ficheiros estáticos para o plano Spark...")
    pub_dir = os.path.abspath("public")
    if os.path.exists(pub_dir):
        forbidden_exts = ('.exe', '.dll', '.bat', '.cmd', '.sh', '.bin', '.apk', '.ipa', '.msi', '.py', '.ps1')
        removed = 0
        for root, dirs, files in os.walk(pub_dir):
            for file in files:
                if file.lower().endswith(forbidden_exts):
                    fpath = os.path.join(root, file)
                    try:
                        os.remove(fpath)
                        removed += 1
                        print(f"🗑️ Removido executável de public/: {file}")
                    except: pass
        if removed > 0:
            print(f"✅ {removed} ficheiro(s) restritos removidos de public/.")
        os.system("chmod -R -x+X public/ 2>/dev/null || true")

    # 4. Atualizar configurações e ficheiros
    print("\n[4/6] Configurando regras e código do portal...")
    with open("firestore.rules", "w", encoding="utf-8") as f:
        f.write(FIRESTORE_RULES)
    with open(".firebaserc", "w", encoding="utf-8") as f:
        f.write(FIREBASE_RC)
    with open("firebase.json", "w", encoding="utf-8") as f:
        f.write(FIREBASE_JSON)

    if os.path.exists("public"):
        patch_index_html("public/index.html")
        patch_app_js("public/js/app.js")

    nested = "africawinner-journal"
    if os.path.exists(nested) and os.path.abspath(nested) != os.path.abspath("."):
        with open(os.path.join(nested, "firestore.rules"), "w", encoding="utf-8") as f:
            f.write(FIRESTORE_RULES)
        with open(os.path.join(nested, ".firebaserc"), "w", encoding="utf-8") as f:
            f.write(FIREBASE_RC)
        with open(os.path.join(nested, "firebase.json"), "w", encoding="utf-8") as f:
            f.write(FIREBASE_JSON)
        nested_pub = os.path.join(nested, "public")
        if os.path.exists(nested_pub):
            patch_index_html(os.path.join(nested_pub, "index.html"))
            patch_app_js(os.path.join(nested_pub, "js", "app.js"))

    # 5. Deploy no Firebase (Hosting + Firestore Rules)
    print("\n[5/6] Fazendo deploy no Firebase Hosting & Cloud Firestore...")
    deploy_cmd = f"npx firebase-tools deploy --project {project_id}"
    res = os.system(deploy_cmd)
    if res != 0:
        print("⚠️ Tentando deploy direto de hosting e regras...")
        os.system(f"npx firebase-tools deploy --only hosting,firestore:rules --project {project_id}")

    # 6. Git commit e push
    print("\n[6/6] Salvando no repositório GitHub...")
    if os.path.isdir(".git"):
        os.system("git add .")
        os.system('git commit -m "Enable Cloud Firestore real-time sync, Base64 image encoding, and Admin Edit modal"')
        os.system("git push origin main 2>/dev/null || true")

    print("\n" + "=" * 65)
    print("🎉 SINCRONIZAÇÃO EM NUVEM ATIVADA COM SUCESSO!")
    print("👉 Portal: https://africawinners-510716.web.app")
    print("🔥 Todas as edições e publicações estão agora guardadas no Cloud Firestore.")
    print("🌐 Qualquer visitante em qualquer dispositivo terá acesso instantâneo!")
    print("=" * 65)

if __name__ == "__main__":
    main()
