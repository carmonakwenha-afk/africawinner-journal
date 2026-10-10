#!/usr/bin/env python3
"""
AfricaWinners Scientific Blog & Tech Hub (AWSJ)
Script de Migração Oficial para Firebase Hosting & Transformação Acadêmica de Alto Calibre
- Identidade visual institucional clássica (Nature Africa / SciELO style)
- Preservação integral dos dizeres e lemas do Fundador Valdimir Jacinto Esteves
- Remoção completa de estereótipos ou menções a inteligência artificial
- Frontispício oficial do Journal (Volume I 2026, ISSN 2959-1082, Selo e Certificação)
- Validador de Conformidade Metodológica & Normas IMRyD (100% no cliente e offline)
- Eliminação de artigos sintéticos e métricas infladas (contadores limpos a 0)
- Persistência permanente em localStorage (artigos e parceiros do Administrador não se apagam)
- Configuração oficial de SEO (Google Search Console meta tag, robots.txt, sitemap.xml)
- Configuração para Firebase Hosting (africawinners-510716.web.app)
"""

import os
import re

ROBOTS_TXT = """User-agent: *
Allow: /

Sitemap: https://africawinners-510716.web.app/sitemap.xml
Sitemap: https://africawinner-journal.onrender.com/sitemap.xml
"""

SITEMAP_XML = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://africawinners-510716.web.app/</loc>
    <lastmod>2026-10-10</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://africawinner-journal.onrender.com/</loc>
    <lastmod>2026-10-10</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
"""

FIREBASE_RC = """{
  "projects": {
    "default": "africawinners-510716"
  }
}
"""

FIREBASE_JSON = """{
  "hosting": {
    "public": "public",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
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

JOURNAL_COVER_HTML = """<div class="hero-media-wrapper">
          <div class="journal-cover-frame">
            <div class="journal-cover-header">
              <div class="journal-cover-volume">VOLUME I • EDIÇÃO 2026</div>
              <div class="journal-cover-issn">ISSN 2959-1082 (ONLINE)</div>
            </div>

            <div class="journal-cover-body">
              <div class="journal-seal-circle">
                <i class="fas fa-university"></i>
              </div>
              <h3 class="journal-cover-title">AFRICAWINNERS</h3>
              <p class="journal-cover-subtitle">SCIENTIFIC BLOG &amp; TECH HUB (AWSJ)</p>
              
              <div class="journal-cover-divider"></div>
              
              <p class="journal-cover-desc">
                Inovação Comunitária, Robótica Educacional, Ciências Aplicadas e Documentação Acadêmica de Base em África.
              </p>

              <div class="journal-cover-leadership">
                <div class="journal-lead-line">
                  <i class="fas fa-award"></i>
                  <span><strong>Fundador &amp; Mentor:</strong> Valdimir Jacinto Esteves</span>
                </div>
                <div class="journal-entity-line">
                  <i class="fas fa-landmark"></i>
                  <span>Escritório Esteves &amp; Multi-Serviços</span>
                </div>
              </div>
            </div>

            <div class="journal-cover-footer">
              <span class="journal-badge-open"><i class="fas fa-lock-open"></i> Acesso Aberto (Open Access)</span>
              <span class="journal-badge-cert"><i class="fas fa-certificate"></i> Certificação Oficial</span>
            </div>
          </div>
        </div>"""

JOURNAL_COVER_CSS = """
/* ==========================================================================
   FRONTISPÍCIO EDITORIAL ACADÉMICO (JOURNAL COVER FRAME)
   ========================================================================== */
.journal-cover-frame {
  position: relative;
  background: linear-gradient(145deg, #09172c 0%, #0d223f 50%, #061120 100%);
  border: 1px solid rgba(212, 175, 55, 0.45);
  border-radius: var(--radius-md);
  box-shadow: 0 15px 45px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  padding: 2.25rem 1.75rem;
  overflow: hidden;
  text-align: center;
}

.journal-cover-frame::before {
  content: '';
  position: absolute;
  top: 8px;
  left: 8px;
  right: 8px;
  bottom: 8px;
  border: 1px solid rgba(212, 175, 55, 0.22);
  border-radius: calc(var(--radius-md) - 4px);
  pointer-events: none;
}

.journal-cover-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(212, 175, 55, 0.25);
}

.journal-cover-volume, .journal-cover-issn {
  font-family: var(--font-mono, monospace);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  color: var(--gold-primary);
  font-weight: 600;
}

.journal-cover-body {
  padding: 1rem 0 1.5rem;
}

.journal-seal-circle {
  width: 72px;
  height: 72px;
  margin: 0 auto 1.25rem;
  border-radius: 50%;
  border: 2px solid var(--gold-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle, rgba(212, 175, 55, 0.18) 0%, rgba(9, 23, 44, 0.8) 100%);
  box-shadow: 0 0 25px rgba(212, 175, 55, 0.25);
  color: var(--gold-light);
  font-size: 1.8rem;
}

.journal-cover-title {
  font-family: var(--font-serif);
  font-size: 1.75rem;
  color: #ffffff;
  letter-spacing: 0.06em;
  font-weight: 700;
  margin-bottom: 0.35rem;
}

.journal-cover-subtitle {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--gold-light);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  margin-bottom: 1rem;
}

.journal-cover-divider {
  width: 60px;
  height: 2px;
  background: var(--gold-gradient);
  margin: 0 auto 1.15rem;
}

.journal-cover-desc {
  font-size: 0.84rem;
  color: var(--text-secondary);
  line-height: 1.6;
  max-width: 340px;
  margin: 0 auto 1.5rem;
}

.journal-cover-leadership {
  background: rgba(212, 175, 55, 0.08);
  border: 1px solid var(--gold-border);
  border-radius: var(--radius-sm);
  padding: 0.75rem 1rem;
  margin-bottom: 1.25rem;
  font-size: 0.8rem;
  line-height: 1.5;
}

.journal-lead-line {
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.journal-lead-line i {
  color: var(--gold-primary);
}

.journal-entity-line {
  color: var(--gold-light);
  font-size: 0.76rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.journal-cover-footer {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.journal-badge-open, .journal-badge-cert {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.3rem 0.75rem;
  border-radius: var(--radius-pill);
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.journal-badge-open {
  background: rgba(16, 185, 129, 0.12);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.journal-badge-cert {
  background: rgba(212, 175, 55, 0.12);
  color: var(--gold-light);
  border: 1px solid var(--gold-border);
}

.btn-secondary-pill {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: var(--radius-pill);
  padding: 0.75rem 1.6rem;
  font-weight: 600;
  font-size: 0.95rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: var(--transition-fast);
}

.btn-secondary-pill:hover {
  background: rgba(212, 175, 55, 0.12);
  border-color: var(--gold-primary);
  color: #ffffff;
  transform: translateY(-2px);
}
"""

def patch_index_html(file_path):
    if not os.path.exists(file_path):
        return
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Google Search Console meta tag
    if "whRkUDrvrqEvv9ZhV8T7-RXB8AolO5iB7eUl_O6pNY0" not in content:
        content = re.sub(
            r"(<meta\s+name=[\"']google-site-verification[\"'][^>]*>)",
            '<meta name="google-site-verification" content="whRkUDrvrqEvv9ZhV8T7-RXB8AolO5iB7eUl_O6pNY0" />',
            content,
            flags=re.IGNORECASE
        )
        if "whRkUDrvrqEvv9ZhV8T7-RXB8AolO5iB7eUl_O6pNY0" not in content and "<head>" in content:
            content = content.replace("<head>", '<head>\n  <meta name="google-site-verification" content="whRkUDrvrqEvv9ZhV8T7-RXB8AolO5iB7eUl_O6pNY0" />')

    # 2. Inserir metadados para indexadores acadêmicos (Google Scholar)
    if "citation_journal_title" not in content:
        scholarly_meta = """  <!-- Scholarly Metadata for Google Scholar & Academic Indexers -->
  <meta name="citation_journal_title" content="AfricaWinners Scientific Blog & Tech Hub">
  <meta name="citation_journal_abbrev" content="AWSJ">
  <meta name="citation_issn" content="2959-1082">
  <meta name="citation_publisher" content="AfricaWinners / Escritório Esteves & Multi-Serviços">
  <meta name="citation_language" content="pt">
"""
        content = content.replace('<meta name="google-site-verification"', scholarly_meta + '\n  <meta name="google-site-verification"')

    # 3. Preservar Dizeres Oficiais da AfricaWinners
    content = re.sub(
        r'<span data-i18n="heroTitleMain">[^<]*</span>',
        lambda m: '<span data-i18n="heroTitleMain">CADA COMUNIDADE TEM HISTÓRIAS &amp; CIÊNCIA QUE MERECEM SER ETERNIZADAS.</span>',
        content
    )
    content = re.sub(
        r'<span data-i18n="heroKicker">[^<]*</span>',
        lambda m: '<span data-i18n="heroKicker">Iniciativa de Mentoria &amp; Divulgação Científica em África</span>',
        content
    )

    # 4. Frontispício do Journal no lugar de imagens de IA
    if "journal-cover-frame" not in content:
        content = re.sub(
            r'<div class="hero-media-wrapper">[\s\S]*?</div>\s*</div>\s*</div>\s*</section>',
            lambda m: JOURNAL_COVER_HTML + '\n      </div>\n    </div>\n  </section>',
            content
        )
        content = re.sub(
            r'<img[^>]*hero-science\.jpg[^>]*>',
            lambda m: JOURNAL_COVER_HTML,
            content
        )

    # 5. Botões do Hero: Normas IMRyD em vez de Assistente IA
    content = re.sub(
        r'<button class="btn btn-brand-pill[^>]*data-modal-open="aiAssistantModal"[^>]*>[\s\S]*?</button>',
        lambda m: '<a href="#diretrizes" class="btn btn-secondary-pill btn-lg"><i class="fas fa-scroll"></i> <span data-i18n="btnGuideHero">Normas Editoriais IMRyD</span></a>',
        content
    )

    # 6. Rebranding do Modal para Validador IMRyD
    content = re.sub(
        r'Assistente IA de Reda[çc][ãa]o Cient[íi]fica',
        lambda m: 'Validador de Conformidade Metodológica & Normas IMRyD',
        content
    )
    content = re.sub(
        r'Estrutura[çc][ãa]o com Intelig[êe]ncia Artificial',
        lambda m: 'Estruturação Editorial Internacional • Padrão ABNT / APA / Vancouver',
        content
    )

    # 7. Substituir ícone robot por microchip nos cards de projecto tech
    content = re.sub(
        r'<div class="pub-type-card-icon"><i class="fas fa-robot"></i></div>',
        lambda m: '<div class="pub-type-card-icon"><i class="fas fa-microchip"></i></div>',
        content
    )
    content = re.sub(
        r'<i class="fas fa-robot"></i> Fotos & Vídeos',
        lambda m: '<i class="fas fa-microchip"></i> Fotos & Vídeos',
        content
    )

    # 8. Zerar contadores estáticos
    content = re.sub(r'<div class="stat-value" id="statPublished">[^<]*</div>', lambda m: '<div class="stat-value" id="statPublished">0</div>', content)
    content = re.sub(r'<div class="stat-value" id="statSubmissions">[^<]*</div>', lambda m: '<div class="stat-value" id="statSubmissions">0</div>', content)
    content = re.sub(r'<div class="stat-value" id="statDownloads">[^<]*</div>', lambda m: '<div class="stat-value" id="statDownloads">0</div>', content)
    content = re.sub(r'<div class="stat-value" id="statViews">[^<]*</div>', lambda m: '<div class="stat-value" id="statViews">0</div>', content)

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"✅ Atualizado com sucesso: {file_path}")

def patch_style_css(file_path):
    if not os.path.exists(file_path):
        return
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Tipografia e Cores Acadêmicas
    content = re.sub(
        r"--font-impact:\s*[^;]+;",
        lambda m: "--font-impact: 'Cinzel', 'Playfair Display', Georgia, serif;",
        content
    )
    content = re.sub(
        r"--font-heading:\s*[^;]+;",
        lambda m: "--font-heading: 'Cinzel', 'Playfair Display', Georgia, serif;",
        content
    )
    content = re.sub(
        r"--accent-ai:\s*[^;]+;",
        lambda m: "--accent-imryd: #38bdf8;",
        content
    )

    # 2. Injetar CSS do Journal Cover se não existir
    if ".journal-cover-frame" not in content:
        content += "\n" + JOURNAL_COVER_CSS

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"✅ Atualizado com sucesso: {file_path}")

def patch_app_js(file_path):
    if not os.path.exists(file_path):
        return
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Zerar defaultArticlesData
    content = re.sub(
        r'const\s+defaultArticlesData\s*=\s*\[[\s\S]*?\];',
        lambda m: 'const defaultArticlesData = [];',
        content
    )

    # 2. Injetar funções de persistência
    if "function getSavedArticles()" not in content:
        persistence_code = """
// ==========================================================================
// ARMAZENAMENTO PERSISTENTE (FIREBASE HOSTING & OFFLINE-FIRST)
// ==========================================================================
function getSavedArticles() {
  const saved = localStorage.getItem('awsj_custom_articles');
  if (saved) {
    try { return JSON.parse(saved); } catch(e) {}
  }
  return [];
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
"""
        content = re.sub(r'(const\s+defaultArticlesData\s*=\s*\[\];)', lambda m: persistence_code + '\n' + m.group(1), content)

    # 3. Estado inicial seguro
    content = re.sub(r'articles:\s*\[[\s\S]*?\],', lambda m: 'articles: getSavedArticles(),', content)
    content = re.sub(r'articles:\s*defaultArticlesData,', lambda m: 'articles: getSavedArticles(),', content)
    content = re.sub(r'partners:\s*\[[\s\S]*?\],', lambda m: 'partners: getSavedPartners(),', content)

    # 4. Substituir ícones de robô por microchip
    content = content.replace("fas fa-robot", "fas fa-microchip")

    # 5. Salvar artigos após operações do admin
    admin_operations = [
        ('State.articles.unshift(newArticle);', 'State.articles.unshift(newArticle);\n  saveArticlesLocally(State.articles);'),
        ('State.articles[artIdx].status = status;', 'State.articles[artIdx].status = status;\n  saveArticlesLocally(State.articles);'),
        ('State.articles = State.articles.filter(a => a.id !== id);', 'State.articles = State.articles.filter(a => a.id !== id);\n  saveArticlesLocally(State.articles);'),
    ]
    for target, repl in admin_operations:
        if "saveArticlesLocally(State.articles)" not in content and target in content:
            content = content.replace(target, repl)

    # 6. Atualizar I18N com dizeres originais intactos
    content = re.sub(
        r'heroTitleMain:\s*["\'].*?["\'],',
        lambda m: 'heroTitleMain: "CADA COMUNIDADE TEM HISTÓRIAS & CIÊNCIA QUE MERECEM SER ETERNIZADAS.",',
        content
    )
    content = re.sub(
        r'heroTitleGold:\s*["\'].*?["\'],',
        lambda m: 'heroTitleGold: "AfricaWinners Scientific Blog & Tech Hub",',
        content
    )
    content = re.sub(
        r'heroDesc:\s*["\'].*?["\'],',
        lambda m: 'heroDesc: "Unimos mentoria científica sob a liderança do Fundador Valdimir Jacinto Esteves, tecnologia e divulgação comunitária para capacitar a nova geração de investigadores. Partilhe a sua actividade, projeto, artigo ou inovação com Certificado Oficial.",',
        content
    )
    content = re.sub(
        r'heroKicker:\s*["\'].*?["\'],',
        lambda m: 'heroKicker: "Iniciativa de Mentoria & Divulgação Científica em África",',
        content
    )

    # 7. Atualizar Assistente IA para Validador IMRyD
    imryd_code = '''// ==========================================================================
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
      const words = text.split(/\\s+/).filter(w => w.length > 0);
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
        formattedSummary = `Introdução: ${title ? 'O presente trabalho aborda ' + title + '. ' : ''}${text}\\n\\nMetodologia: Adotou-se uma abordagem analítica e descritiva orientada aos requisitos metodológicos do portal.\\n\\nResultados: Os dados analisados demonstram a relevância das observações e a aplicabilidade das soluções apresentadas.\\n\\nConclusão: Conclui-se que o estudo contribui para o avanço da inovação e documentação acadêmica.`;
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
          <button type="button" class="btn btn-brand-pill btn-sm" onclick="applyAISuggestions('${escapeHtml(formattedSummary.replace(/'/g, "\\\\'").replace(/\\n/g, '\\\\n'))}', '${escapeHtml(keywordsFinal.replace(/'/g, "\\\\'"))}')"><i class="fas fa-check"></i> Inserir no Formulário de Submissão</button>
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
}'''

    content = re.sub(
        r'// ==========================================================================\s*// ASSISTENTE DE INTELIGÊNCIA ARTIFICIAL[\s\S]*?showToast\(\'Sugestões da IA inseridas com sucesso no formulário!\', \'success\'\);\s*\}',
        lambda m: imryd_code,
        content
    )

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"✅ Atualizado com sucesso: {file_path}")

def patch_database_js(file_path):
    if not os.path.exists(file_path):
        return
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Remover bloco de seed de artigos artificiais
    content = re.sub(
        r'// Inserir artigos exemplares se a tabela estiver vazia[\s\S]*?console\.log\(\'📚 Artigos exemplares[\s\S]*?\}\);\s*\}\);',
        lambda m: "// Base de dados de artigos limpa: sem artigos fictícios nem métricas falsas\n    console.log('✅ Base de dados limpa e pronta.');",
        content
    )

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"✅ Atualizado com sucesso: {file_path}")

def main():
    print("🚀 A iniciar processo de migração e limpeza para Firebase Hosting...")

    targets = [".", "africawinner-journal"]

    for base in targets:
        if not os.path.exists(base):
            continue

        pub_dir = os.path.join(base, "public")
        if os.path.exists(pub_dir):
            patch_index_html(os.path.join(pub_dir, "index.html"))
            patch_style_css(os.path.join(pub_dir, "css", "style.css"))
            patch_app_js(os.path.join(pub_dir, "js", "app.js"))

            with open(os.path.join(pub_dir, "robots.txt"), "w", encoding="utf-8") as f:
                f.write(ROBOTS_TXT)
            with open(os.path.join(pub_dir, "sitemap.xml"), "w", encoding="utf-8") as f:
                f.write(SITEMAP_XML)

            ai_img = os.path.join(pub_dir, "assets", "hero-science.jpg")
            if os.path.exists(ai_img):
                try:
                    os.remove(ai_img)
                    print(f"🗑️ Removida imagem de IA: {ai_img}")
                except Exception as e:
                    print(f"Aviso ao remover {ai_img}: {e}")

        patch_database_js(os.path.join(base, "database.js"))

        with open(os.path.join(base, ".firebaserc"), "w", encoding="utf-8") as f:
            f.write(FIREBASE_RC)
        with open(os.path.join(base, "firebase.json"), "w", encoding="utf-8") as f:
            f.write(FIREBASE_JSON)

    print("\n🎉 Todas as alterações e limpezas aplicadas com sucesso!")

if __name__ == "__main__":
    main()
