import re

with open('public/js/app.js', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Remover qualquer declaração duplicada isolada de defaultArticlesData
c = re.sub(r'^[ \t]*const\s+defaultArticlesData\s*=\s*\[\];[ \t]*\r?\n?', '', c, flags=re.MULTILINE)

# 2. Esvaziar o catálogo de demonstração inicial (zero artigos não solicitados)
c = re.sub(r'const\s+defaultArticlesData\s*=\s*\[[\s\S]*?\];', 'const defaultArticlesData = [];', c, count=1)

# 3. Corrigir getSavedArticles para retornar vazio quando nada estiver salvo
c = c.replace("if (Array.isArray(parsed) && parsed.length > 0) return parsed;", "if (Array.isArray(parsed)) return parsed;")
c = c.replace("return (typeof defaultArticlesData !== 'undefined' && Array.isArray(defaultArticlesData)) ? defaultArticlesData : [];", "return [];")

# 4. Desativar seeder automático no initCloudSync
c = re.sub(r'\} else \{\s*const local = getSavedArticles\(\);[\s\S]*?local\.forEach\(a => saveArticleToCloud\(a\)\);\s*\}', '} else { State.articles = []; saveArticlesLocally([]); }', c)

# 5. Filtro estrito: apenas itens publicados aparecem no blog
if "function renderArticles() {" in c:
    c = re.sub(r'function renderArticles\(\) \{\s*const grid = document\.getElementById\(\'articlesGrid\'\);\s*if \(!grid\) return;\s*const filtered = State\.articles\.filter\(art => \{', "function renderArticles() { const grid = document.getElementById('articlesGrid'); if (!grid) return; const filtered = (State.articles || []).filter(art => { if (art.status !== 'Published') return false;", c)

# 6. Eliminação real na nuvem no deleteArticle
if 'await deleteArticleFromCloud(articleId);' not in c:
    c = c.replace("State.articles = State.articles.filter(a => String(a.id) !== String(articleId));", "State.articles = State.articles.filter(a => String(a.id) !== String(articleId));\n  saveArticlesLocally(State.articles);\n  await deleteArticleFromCloud(articleId);")

# 7. Salvar na nuvem quando o mentor aprova
if 'await saveArticleToCloud(art);' not in c:
    c = c.replace("art.status = 'Published';", "art.status = 'Published';\n    saveArticlesLocally(State.articles);\n    await saveArticleToCloud(art);")

# 8. Função limpa para purgar artigos de teste (sem quebras de linha em strings)
purge_code = '''async function purgeUnwantedArticles() {
  if (!confirm("Deseja eliminar todas as publicacoes nao aprovadas ou artigos de demonstracao anteriores? Apenas publicacoes aprovadas serao mantidas.")) return;
  const toDelete = (State.articles || []).filter(a => ['1','2','3','4'].includes(String(a.id)) || a.status !== 'Published');
  for (const art of toDelete) {
    await deleteArticleFromCloud(art.id);
    State.articles = (State.articles || []).filter(a => String(a.id) !== String(art.id));
  }
  saveArticlesLocally(State.articles);
  renderArticles();
  loadAdminArticles();
  fetchJournalStats();
  showToast('Limpeza concluida com sucesso!', 'success');
}
'''
if 'function purgeUnwantedArticles' not in c:
    c = c.replace("async function handleAdminDirectPublish(e) {", purge_code + "\nasync function handleAdminDirectPublish(e) {")

# 9. Injetar modal de edição administrativa se necessário
edit_modal_code = '''function openEditArticleModal(artId) {
  const art = (State.articles || []).find(a => String(a.id) === String(artId));
  if (!art) {
    showToast('Publicacao nao encontrada para edicao.', 'error');
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
    showToast('Publicacao nao encontrada.', 'error');
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

  showToast('Publicacao atualizada e salva na nuvem com sucesso!', 'success');

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Alteracoes';
  }
}
'''
if 'function openEditArticleModal' not in c:
    c = c.replace("function renderAdminArticlesList(articles, container) {", edit_modal_code + "\nfunction renderAdminArticlesList(articles, container) {")

with open('public/js/app.js', 'w', encoding='utf-8') as f:
    f.write(c)

# Atualizar versão do cache no index.html
with open('public/index.html', 'r', encoding='utf-8') as f:
    h = f.read()
h = re.sub(r'src="js/app\.js(\?[^"]*)?"', 'src="js/app.js?v=20261010_restored_clean"', h)
with open('public/index.html', 'w', encoding='utf-8') as f:
    f.write(h)

print("✅ Modais, Contas e Painel Administrativo restaurados e 100% limpos!")
