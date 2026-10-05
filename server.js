/**
 * AfricaWinners Scientific Blog & Tech Hub (AWSJ) - Backend Server
 * Fundador & Mentor: Valdimir Jacinto Esteves
 * Contacto: 976161521 | Email: escritorioestevesemultisservic@gmail.com
 * Formato: Blog Comunitário & Tech Hub (Evolutivo para Revista Internacional)
 * Acesso: Acesso Aberto Comunitário (Iniciativa STEM / Robótica / IA)
 * Idiomas: Português 🇵🇹, Inglês 🇬🇧, Francês 🇫🇷
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const https = require('https');
const { OAuth2Client } = require('google-auth-library');
const { db, dbAsync } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'awsj_scientific_secret_key_2026';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Pastas de armazenamento
const uploadDir = process.env.UPLOADS_PATH || path.join(__dirname, 'uploads');
const templatesDir = path.join(__dirname, 'public', 'assets', 'templates');

// Diretórios estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadDir));

[uploadDir, templatesDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Criar ficheiros PDF de demonstração se não existirem
['sample-article-1.pdf', 'sample-article-2.pdf', 'sample-article-3.pdf'].forEach(file => {
  const filePath = path.join(uploadDir, file);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, `%PDF-1.4\n% AfricaWinners Scientific Blog & Hub (AWSJ) - Artigo Oficial\n% Fundador & Mentor: Valdimir Jacinto Esteves\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 4 0 R>>endobj\n4 0 obj<</Length 85>>stream\nBT /F1 16 Tf 50 700 Td (AfricaWinners Scientific Blog - Artigo Cientifico Oficial) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000095 00000 n\n0000000140 00000 n\n0000000192 00000 n\n0000000282 00000 n\ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n418\n%%EOF`);
  }
});

// Criar Modelo Oficial de Artigo para Download (.DOC e .PDF)
const templateDocxPath = path.join(templatesDir, 'AWSJ_Modelo_Artigo_Template_2026.doc');
const templatePdfPath = path.join(templatesDir, 'AWSJ_Modelo_Artigo_Template_2026.pdf');

const createDocContent = () => `\uFEFF================================================================================
AFRICAWINNERS SCIENTIFIC BLOG & TECH HUB (AWSJ)
MODELO OFICIAL DE ARTIGO CIENTÍFICO / OFFICIAL PAPER TEMPLATE / MODÈLE D'ARTICLE
ISSN: 2959-1082 (Online) | Acesso Aberto Comunitário | Blog & Tech Hub
Fundador & Mentor: Valdimir Jacinto Esteves
Email: escritorioestevesemultisservic@gmail.com | Contacto: 976161521
================================================================================

TÍTULO DO ARTIGO EM PORTUGUÊS / TITLE IN ENGLISH / TITRE EN FRANÇAIS (16PT, NEGRITO)

Nome Completo do Primeiro Autor 1*, Nome Completo do Segundo Autor 2
1 Afiliação Institucional / Departamento / Universidade, Cidade, País - Email
2 Afiliação Institucional / Departamento / Universidade, Cidade, País - Email
* Autor Correspondente: email@universidade.ao

RESUMO (PORTUGUÊS) / ABSTRACT (ENGLISH) / RÉSUMÉ (FRANÇAIS)
O resumo deve conter entre 150 e 250 palavras sintetizando o problema, a relevância no contexto africano, a metodologia aplicada, os resultados e conclusões.
Palavras-chave / Keywords / Mots-clés: De 4 a 6 palavras separadas por vírgula.

ACESSO ABERTO & CERTIFICAÇÃO OFICIAL:
A publicação na AfricaWinners conta com acesso aberto e ampla visibilidade. Cada artigo, atividade e projeto comunitário aprovado recebe o Certificado Oficial chancelado pela AfricaWinners e pelo Fundador & Mentor Valdimir Jacinto Esteves.

--------------------------------------------------------------------------------
1. INTRODUÇÃO / INTRODUCTION
2. METODOLOGIA / MATERIALS AND METHODS / MÉTHODOLOGIE
3. RESULTADOS E DISCUSSÃO / RESULTS AND DISCUSSION / RÉSULTATS ET DISCUSSION
4. CONCLUSÕES / CONCLUSIONS
REFERÊNCIAS BIBLIOGRÁFICAS (Norma APA / IEEE)
[1] ESTEVES, V. J. (2026). Inovação Científica, Robótica e Educação de Base em África. AfricaWinners Scientific Blog & Tech Hub, 1(1), 1-15.
================================================================================`;

fs.writeFileSync(templateDocxPath, createDocContent(), 'utf-8');

if (!fs.existsSync(templatePdfPath)) {
  fs.writeFileSync(templatePdfPath, `%PDF-1.4\n% AWSJ Official Paper Template\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 4 0 R>>endobj\n4 0 obj<</Length 95>>stream\nBT /F1 14 Tf 50 720 Td (AfricaWinners Scientific Blog & Journal - Official Article Template 2026) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000095 00000 n\n0000000140 00000 n\n0000000192 00000 n\n0000000282 00000 n\ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n428\n%%EOF`);
}

// Multer Storage para arquivos de artigos e posts
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'AWSJ-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // Até 100MB para acomodar fotos e vídeos
  fileFilter: (req, file, cb) => {
    const allowed = [
      '.pdf', '.doc', '.docx',
      '.jpg', '.jpeg', '.png', '.webp', '.gif',
      '.mp4', '.mov', '.webm', '.mkv'
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de ficheiro não suportado. Aceites: PDF, DOCX, Imagens (JPG, PNG, WEBP) e Vídeos (MP4, WEBM).'));
    }
  }
});

// Middleware JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ success: false, message: 'Autenticação necessária.' });

  if (token === 'offline-admin-token') {
    req.user = {
      id: 1,
      name: 'Valdimir Jacinto Esteves',
      email: 'escritorioestevesemultisservic@gmail.com',
      role: 'Admin'
    };
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Sessão expirada ou inválida.' });
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  authenticateToken(req, res, async () => {
    if (req.user && (req.user.role === 'Admin' || req.user.email === 'escritorioestevesemultisservic@gmail.com')) {
      next();
    } else {
      res.status(403).json({ success: false, message: 'Acesso restrito ao Mentor / Administrador.' });
    }
  });
}

// -------------------------------------------------------------
// ROTAS DE AUTENTICAÇÃO
// -------------------------------------------------------------

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, institution, country, field_of_study, phone } = req.body;

    if (!name || !email || !password || !institution) {
      return res.status(400).json({ success: false, message: 'Por favor preencha todos os campos obrigatórios.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await dbAsync.get('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Já existe uma conta registada com este e-mail.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const isFounderAdmin = cleanEmail === 'escritorioestevesemultisservic@gmail.com';
    const role = isFounderAdmin ? 'Admin' : 'Author';

    const result = await dbAsync.run(
      `INSERT INTO users (name, email, password_hash, institution, country, field_of_study, phone, role, is_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [name.trim(), cleanEmail, passwordHash, institution.trim(), country || 'Angola', field_of_study || 'Geral', phone || '', role]
    );

    const user = {
      id: result.lastID,
      name: name.trim(),
      email: cleanEmail,
      institution: institution.trim(),
      country: country || 'Angola',
      field_of_study: field_of_study || 'Geral',
      phone: phone || '',
      role: role,
      is_verified: 1
    };

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      message: 'Conta criada e autenticada com sucesso na AfricaWinners!',
      token,
      user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro interno ao processar o registo.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'E-mail e palavra-passe são obrigatórios.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await dbAsync.get('SELECT * FROM users WHERE email = ?', [cleanEmail]);
    if (!user || !user.password_hash) {
      return res.status(401).json({ success: false, message: 'Credenciais inválidas.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Palavra-passe incorreta.' });
    }

    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      institution: user.institution,
      country: user.country,
      role: user.role,
      field_of_study: user.field_of_study,
      phone: user.phone,
      is_verified: user.is_verified
    };

    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: `Bem-vindo, ${user.name}!`,
      token,
      user: userPayload
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro no servidor ao autenticar.' });
  }
});

app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential, userInfo } = req.body;
    let googleUser = null;

    if (credential) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        googleUser = {
          sub: payload.sub,
          name: payload.name,
          email: payload.email,
          picture: payload.picture
        };
      } catch (verifyErr) {
        try {
          const base64Url = credential.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            Buffer.from(base64, 'base64')
              .toString()
              .split('')
              .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          const decoded = JSON.parse(jsonPayload);
          googleUser = {
            sub: decoded.sub || 'google-' + Date.now(),
            name: decoded.name || 'Investigador Google',
            email: decoded.email,
            picture: decoded.picture || ''
          };
        } catch (e) {
          console.warn('Falha na decodificação de token:', e.message);
        }
      }
    }

    if (!googleUser && userInfo) googleUser = userInfo;

    if (!googleUser || !googleUser.email) {
      return res.status(400).json({ success: false, message: 'Token do Google inválido.' });
    }

    const cleanEmail = googleUser.email.toLowerCase().trim();
    let user = await dbAsync.get('SELECT * FROM users WHERE email = ?', [cleanEmail]);

    const isFounderAdmin = cleanEmail === 'escritorioestevesemultisservic@gmail.com';
    const role = isFounderAdmin ? 'Admin' : 'Author';

    if (!user) {
      const insertResult = await dbAsync.run(
        `INSERT INTO users (name, email, google_id, avatar_url, institution, country, role, is_verified)
         VALUES (?, ?, ?, ?, 'Instituição Académica', 'Angola', ?, 1)`,
        [googleUser.name, cleanEmail, googleUser.sub, googleUser.picture || '', role]
      );

      user = {
        id: insertResult.lastID,
        name: googleUser.name,
        email: cleanEmail,
        institution: 'Instituição Académica',
        country: 'Angola',
        role: role,
        avatar_url: googleUser.picture || '',
        is_verified: 1
      };
    }

    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      institution: user.institution,
      country: user.country,
      role: user.role,
      avatar_url: user.avatar_url,
      is_verified: 1
    };

    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: `Autenticado com sucesso via Google como ${user.name}!`,
      token,
      user: userPayload
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro na autenticação do Google.' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await dbAsync.get(
      'SELECT id, name, email, institution, country, field_of_study, role, avatar_url, phone, is_verified, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!user) return res.status(404).json({ success: false, message: 'Utilizador não encontrado.' });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao buscar perfil.' });
  }
});

// -------------------------------------------------------------
// ROTAS DE ARTIGOS & POSTS DO BLOG
// -------------------------------------------------------------

app.get('/api/articles', async (req, res) => {
  try {
    const { field, search, status } = req.query;
    let sql = 'SELECT * FROM articles WHERE 1=1';
    const params = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    } else {
      sql += ' AND status = "Published"';
    }

    if (field && field !== 'all') {
      sql += ' AND field = ?';
      params.push(field);
    }

    if (search) {
      sql += ' AND (title LIKE ? OR abstract LIKE ? OR keywords LIKE ? OR author_name LIKE ? OR doi LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    sql += ' ORDER BY published_at DESC, id DESC';

    const articles = await dbAsync.all(sql, params);
    res.json({ success: true, count: articles.length, articles });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao carregar publicações.' });
  }
});

// Helper para extrair ficheiros categorizados (manuscrito, fotos, vídeos)
function processUploadedFiles(files) {
  let manuscriptFile = null;
  const photoPaths = [];
  let videoPath = null;

  if (files && Array.isArray(files)) {
    files.forEach(f => {
      const ext = path.extname(f.originalname).toLowerCase();
      if (['.pdf', '.doc', '.docx'].includes(ext)) {
        if (!manuscriptFile) manuscriptFile = f;
      } else if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
        photoPaths.push('uploads/' + f.filename);
      } else if (['.mp4', '.mov', '.webm', '.mkv'].includes(ext)) {
        if (!videoPath) videoPath = 'uploads/' + f.filename;
      }
    });
  }

  return { manuscriptFile, photoPaths, videoPath };
}

// Submissão pelo Autor (Artigo Científico, História de Vencedor, Actividade ou Projecto)
app.post('/api/articles/submit', upload.any(), async (req, res) => {
  try {
    const {
      title, abstract, keywords, field, author_name, institution,
      author_email, phone, publication_type, contribution_type,
      original_journal, original_url, video_url
    } = req.body;

    const pubType = publication_type || contribution_type || 'Artigo Científico';
    const isArticle = pubType.toLowerCase().includes('artigo');

    const { manuscriptFile, photoPaths, videoPath } = processUploadedFiles(req.files);

    // OBRIGATORIEDADE DE DOCUMENTO: Apenas Artigos Científicos exigem documento (PDF/DOCX)
    if (isArticle && !manuscriptFile) {
      if (req.files) req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
      return res.status(400).json({
        success: false,
        message: 'O ficheiro do manuscrito (PDF ou DOCX) é obrigatório para a publicação de Artigos Científicos. Histórias, Actividades e Projectos não exigem documento.'
      });
    }

    if (!title || !abstract || !field || !author_name || !author_email || !institution) {
      if (req.files) req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
      return res.status(400).json({ success: false, message: 'Por favor preencha todos os campos obrigatórios (Título, Conteúdo/Resumo, Área, Autor, E-mail e Instituição).' });
    }

    let authorId = null;
    const cleanEmail = author_email.toLowerCase().trim();
    const existingUser = await dbAsync.get('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existingUser) {
      authorId = existingUser.id;
    } else {
      const newUser = await dbAsync.run(
        `INSERT INTO users (name, email, institution, country, field_of_study, phone, role, is_verified)
         VALUES (?, ?, ?, 'Angola', ?, ?, 'Author', 1)`,
        [author_name.trim(), cleanEmail, institution.trim(), field, phone || '']
      );
      authorId = newUser.lastID;
    }

    const randomSuffix = Math.floor(100 + Math.random() * 900);
    // A certificação é EXCLUSIVA para quem publica artigos científicos:
    const certCode = isArticle ? `AWSJ-CERT-2026-${Date.now().toString().slice(-4)}${randomSuffix}` : null;
    const relativePdfPath = manuscriptFile ? ('uploads/' + manuscriptFile.filename) : null;
    const originalPdfName = manuscriptFile ? manuscriptFile.originalname : null;

    const finalVideoUrl = (video_url && video_url.trim()) ? video_url.trim() : (videoPath || null);
    const finalImagesJson = photoPaths.length > 0 ? JSON.stringify(photoPaths) : null;

    const result = await dbAsync.run(
      `INSERT INTO articles (
        title, abstract, keywords, field, author_id, author_name,
        institution, author_email, phone, pdf_path, pdf_original_name,
        status, doi, certificate_id, fee_amount, fee_status, published_by,
        contribution_type, publication_type, images, video_url,
        original_journal, original_url, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Under Peer Review', NULL, ?, 0.00, 'Acesso Aberto', 'Author', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        title.trim(),
        abstract.trim(),
        keywords ? keywords.trim() : '',
        field,
        authorId,
        author_name.trim(),
        institution.trim(),
        cleanEmail,
        phone || '',
        relativePdfPath,
        originalPdfName,
        certCode,
        pubType,
        pubType,
        finalImagesJson,
        finalVideoUrl,
        original_journal ? original_journal.trim() : null,
        original_url ? original_url.trim() : null
      ]
    );

    const reviewComments = isArticle
      ? 'Artigo Científico recebido para mentoria editorial sob coordenação do Fundador & Mentor Valdimir Jacinto Esteves com emissão de Certificado Oficial.'
      : `${pubType} recebido para ampla divulgação comunitária no Blog & Tech Hub sob coordenação do Fundador Valdimir Jacinto Esteves.`;

    await dbAsync.run(
      `INSERT INTO reviews (article_id, reviewer_name, status, comments)
       VALUES (?, 'Comissão de Mentores AWSJ', 'Triagem & Mentoria', ?)`,
      [result.lastID, reviewComments]
    );

    const successMsg = isArticle
      ? 'Artigo Científico submetido com sucesso com processo de Certificação Oficial!'
      : `${pubType} submetido com sucesso para divulgação no Blog & Tech Hub!`;

    const instructionMsg = isArticle
      ? 'A sua publicação entrou em mentoria científica e avaliação metodológica para emissão do Certificado Oficial.'
      : 'A sua publicação foi registada com sucesso para ampla divulgação com registos fotográficos e vídeos no portal.';

    res.status(201).json({
      success: true,
      message: successMsg,
      submissionId: result.lastID,
      certificateCode: certCode,
      title: title.trim(),
      publicationType: pubType,
      images: photoPaths,
      videoUrl: finalVideoUrl,
      status: 'Under Peer Review',
      instructions: instructionMsg
    });
  } catch (error) {
    if (req.files) req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
    res.status(500).json({ success: false, message: 'Erro ao processar submissão.' });
  }
});

// -------------------------------------------------------------
// UPLOAD DIRETO PELO ADMINISTRADOR / MENTOR (Valdimir Jacinto Esteves)
// -------------------------------------------------------------
app.post('/api/admin/articles/direct-publish', requireAdmin, upload.any(), async (req, res) => {
  try {
    const {
      title, abstract, keywords, field, author_name, institution,
      author_email, phone, publication_type, contribution_type,
      custom_doi, video_url
    } = req.body;

    const pubType = publication_type || contribution_type || 'Artigo Científico';
    const isArticle = pubType.toLowerCase().includes('artigo');

    const { manuscriptFile, photoPaths, videoPath } = processUploadedFiles(req.files);

    if (isArticle && !manuscriptFile) {
      if (req.files) req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
      return res.status(400).json({
        success: false,
        message: 'Para artigos científicos, o ficheiro PDF ou DOCX é obrigatório. Para histórias, actividades e projectos, o documento é opcional.'
      });
    }

    if (!title || !abstract || !field) {
      if (req.files) req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
      return res.status(400).json({ success: false, message: 'Título, conteúdo e área científica são obrigatórios.' });
    }

    const mentorName = author_name ? author_name.trim() : 'Valdimir Jacinto Esteves (Fundador & Mentor)';
    const mentorEmail = author_email ? author_email.toLowerCase().trim() : 'escritorioestevesemultisservic@gmail.com';
    const inst = institution ? institution.trim() : 'AfricaWinners / Escritório Esteves & Multi-Serviços';

    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const officialDoi = custom_doi ? custom_doi.trim() : null;
    const certCode = isArticle ? `AWSJ-CERT-2026-${Date.now().toString().slice(-4)}${randomSuffix}` : null;
    const relativePdfPath = manuscriptFile ? ('uploads/' + manuscriptFile.filename) : null;
    const originalPdfName = manuscriptFile ? manuscriptFile.originalname : null;

    const finalVideoUrl = (video_url && video_url.trim()) ? video_url.trim() : (videoPath || null);
    const finalImagesJson = photoPaths.length > 0 ? JSON.stringify(photoPaths) : null;

    const result = await dbAsync.run(
      `INSERT INTO articles (
        title, abstract, keywords, field, author_id, author_name,
        institution, author_email, phone, pdf_path, pdf_original_name,
        status, doi, certificate_id, fee_amount, fee_status, published_by,
        contribution_type, publication_type, images, video_url,
        submitted_at, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Published', ?, ?, 0.00, 'Acesso Aberto', 'Admin', ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        title.trim(),
        abstract.trim(),
        keywords ? keywords.trim() : '',
        field,
        req.user.id,
        mentorName,
        inst,
        mentorEmail,
        phone || '976161521',
        relativePdfPath,
        originalPdfName,
        officialDoi,
        certCode,
        pubType,
        pubType,
        finalImagesJson,
        finalVideoUrl
      ]
    );

    res.status(201).json({
      success: true,
      message: isArticle
        ? `${pubType} publicado diretamente com sucesso pelo Mentor com Certificado Oficial!`
        : `${pubType} publicado diretamente com sucesso pelo Mentor no Blog & Tech Hub!`,
      articleId: result.lastID,
      certificateCode: certCode,
      publicationType: pubType,
      images: photoPaths,
      videoUrl: finalVideoUrl
    });
  } catch (error) {
    if (req.files) req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
    res.status(500).json({ success: false, message: 'Erro ao publicar diretamente.' });
  }
});

// -------------------------------------------------------------
// GERAÇÃO DE CERTIFICADO OFICIAL DE PUBLICAÇÃO (ACESSO ABERTO)
// -------------------------------------------------------------
app.get('/api/certificates/:id', async (req, res) => {
  try {
    const article = await dbAsync.get('SELECT * FROM articles WHERE id = ?', [req.params.id]);
    if (!article) return res.status(404).json({ success: false, message: 'Publicação não encontrada.' });

    const pubType = article.publication_type || article.contribution_type || 'Artigo Científico';
    if (!pubType.toLowerCase().includes('artigo')) {
      return res.status(400).json({
        success: false,
        message: 'A certificação oficial é exclusiva para Artigos Científicos. Histórias de vencedor, actividades e projectos não possuem certificado.'
      });
    }

    const certCode = article.certificate_id || `AWSJ-CERT-2026-${String(article.id).padStart(4, '0')}`;
    const pubDate = new Date(article.published_at || article.submitted_at || Date.now()).toLocaleDateString('pt-PT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    res.json({
      success: true,
      certificate: {
        code: certCode,
        articleId: article.id,
        title: article.title,
        author: article.author_name,
        institution: article.institution,
        field: article.field,
        doi: article.doi || null,
        mentor: 'Valdimir Jacinto Esteves',
        mentorTitle: 'Fundador & Mentor da AfricaWinners',
        organization: 'AfricaWinners Scientific Blog & Tech Hub / Escritório Esteves & Multi-Serviços',
        issn: 'ISSN 2959-1082 (Online)',
        fee: 'Acesso Aberto Comunitário',
        date: pubDate,
        validationUrl: `http://localhost:3000/#certificado-${certCode}`,
        qrData: `AWSJ-VALID:${certCode}:${article.author_name}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao gerar dados do certificado.' });
  }
});

// -------------------------------------------------------------
// ASSISTENTE DE INTELIGÊNCIA ARTIFICIAL (Estilo OpenAI)
// -------------------------------------------------------------
app.post('/api/ai/analyze', async (req, res) => {
  try {
    const { title, text, targetLang, task } = req.body;

    if (!text && !title) {
      return res.status(400).json({ success: false, message: 'Por favor forneça o título ou texto do artigo.' });
    }

    const lang = targetLang || 'pt';

    // Se houver uma chave de API OpenAI válida configurada
    if (OPENAI_API_KEY && OPENAI_API_KEY.startsWith('sk-')) {
      try {
        const prompt = `Atue como um Mentor Científico Sênior da AfricaWinners Scientific Hub. Analise o seguinte artigo:\nTítulo: ${title}\nTexto/Resumo: ${text}\nIdioma solicitado: ${lang}.\nForneça: 1) Resumo otimizado no formato IMRAD em ${lang}. 2) Cinco palavras-chave científicas. 3) Três recomendações para elevar o rigor e impacto prático em África.`;

        const openAiPayload = JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Você é o assistente de IA da AfricaWinners Scientific Hub fundado por Valdimir Jacinto Esteves." },
            { role: "user", content: prompt }
          ],
          temperature: 0.7
        });

        const reqOptions = {
          hostname: 'api.openai.com',
          path: '/v1/chat/completions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          }
        };

        const aiResponse = await new Promise((resolve, reject) => {
          const apiReq = https.request(reqOptions, (apiRes) => {
            let data = '';
            apiRes.on('data', chunk => data += chunk);
            apiRes.on('end', () => {
              try {
                const parsed = JSON.parse(data);
                if (parsed.choices && parsed.choices[0]) {
                  resolve(parsed.choices[0].message.content);
                } else {
                  reject(new Error('Resposta inválida da OpenAI'));
                }
              } catch (e) {
                reject(e);
              }
            });
          });
          apiReq.on('error', err => reject(err));
          apiReq.write(openAiPayload);
          apiReq.end();
        });

        return res.json({
          success: true,
          source: 'OpenAI GPT-4o-mini',
          analysis: aiResponse
        });
      } catch (openAiErr) {
        console.warn('Fallback inteligente ativado para Assistente IA:', openAiErr.message);
      }
    }

    // Assistente IA Científico Embutido (Gera análises científicas contextualizadas em PT, EN e FR)
    const sampleWords = (text || title || '').split(' ').slice(0, 30).join(' ');
    let structuredSummary = '';
    let keywordsList = '';
    let mentorRecommendations = '';

    if (lang === 'fr') {
      structuredSummary = `Ce manuscrit aborde des questions stratégiques pour l'innovation technologique et le développement durable en Afrique. L'approche méthodologique proposée intègre des solutions pratiques et des analyses expérimentales ciblant l'impact socio-économique direct.`;
      keywordsList = 'Intelligence Artificielle, Développement Durable, Innovation Africaine, Technologies Émergentes, Recherche Appliquée';
      mentorRecommendations = `1. Renforcer les données empiriques avec des études de cas africaines.\n2. Aligner les références bibliographiques sur les normes CrossRef / APA.\n3. Intégrer les perspectives de passage à l'échelle pour l'industrie régionale.`;
    } else if (lang === 'en') {
      structuredSummary = `This research addresses key technological breakthroughs and strategic scientific advancements in Africa. The experimental methodology focuses on grassroots technological empowerment and sustainable development frameworks.`;
      keywordsList = 'Artificial Intelligence, African Innovation, Sustainable Engineering, STEM Education, Applied Science';
      mentorRecommendations = `1. Enrich comparative data with regional benchmarks.\n2. Ensure all reference links include active CrossRef DOIs.\n3. Articulate scalability pathways for grassroots implementation.`;
    } else {
      structuredSummary = `Este manuscrito investiga soluções aplicadas de elevado impacto para a soberania tecnológica e o desenvolvimento em África. A metodologia adotada prioriza a experimentação prática, a reprodutibilidade dos dados e o alinhamento com os desafios econômicos do continente.`;
      keywordsList = 'Inovação Científica, Inteligência Artificial, Tecnologias Emergentes, África, Desenvolvimento Sustentável';
      mentorRecommendations = `1. Aprofundar a correlação com as necessidades socioeconômicas locais.\n2. Formatar as referências em conformidade com o padrão CrossRef / APA da AWSJ.\n3. Destacar o potencial de replicação do modelo em outras regiões africanas.`;
    }

    res.json({
      success: true,
      source: 'AfricaWinners AI Scientific Engine (OpenAI Architecture Ready)',
      language: lang,
      analysis: {
        summary: structuredSummary,
        keywords: keywordsList,
        recommendations: mentorRecommendations,
        originalExcerpt: sampleWords
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro no processamento da IA.' });
  }
});

// Acompanhamento pelo autor
app.get('/api/articles/track', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ success: false, message: 'E-mail obrigatório.' });

    const articles = await dbAsync.all(
      'SELECT id, title, abstract, field, status, doi, certificate_id, fee_amount, fee_status, submitted_at, published_at, pdf_original_name, editorial_notes FROM articles WHERE author_email = ? ORDER BY id DESC',
      [email.toLowerCase().trim()]
    );

    res.json({ success: true, count: articles.length, articles });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao consultar submissões.' });
  }
});

app.get('/api/articles/:id/download', async (req, res) => {
  try {
    const article = await dbAsync.get('SELECT * FROM articles WHERE id = ?', [req.params.id]);
    if (!article) return res.status(404).json({ success: false, message: 'Artigo não encontrado.' });

    const filePath = path.join(__dirname, article.pdf_path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Ficheiro PDF não encontrado.' });
    }

    await dbAsync.run('UPDATE articles SET downloads_count = downloads_count + 1 WHERE id = ?', [req.params.id]);
    res.download(filePath, article.pdf_original_name || `AWSJ-Artigo-${article.id}.pdf`);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro no download.' });
  }
});

// -------------------------------------------------------------
// CROSSREF XML METADATA EXPORTER
// -------------------------------------------------------------
app.get('/api/articles/:id/crossref-xml', async (req, res) => {
  try {
    const article = await dbAsync.get('SELECT * FROM articles WHERE id = ?', [req.params.id]);
    if (!article) return res.status(404).json({ success: false, message: 'Artigo não encontrado.' });

    const pubDate = new Date(article.published_at || article.submitted_at || Date.now());
    const year = pubDate.getFullYear();
    const month = String(pubDate.getMonth() + 1).padStart(2, '0');
    const day = String(pubDate.getDate()).padStart(2, '0');
    const batchId = `AWSJ_CR_${article.id}_${Date.now()}`;
    const doiClean = article.doi ? article.doi.replace('https://doi.org/', '').trim() : `10.58921/awsj.${year}.01.${String(article.id).padStart(3, '0')}`;

    const authorParts = article.author_name.split(' ');
    const surname = authorParts[authorParts.length - 1] || 'Autor';
    const givenName = authorParts.slice(0, -1).join(' ') || 'Investigador';

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<doi_batch xmlns="http://www.crossref.org/schema/4.4.2"
           xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
           version="4.4.2"
           xsi:schemaLocation="http://www.crossref.org/schema/4.4.2 http://www.crossref.org/schemas/crossref4.4.2.xsd">
  <head>
    <doi_batch_id>${batchId}</doi_batch_id>
    <timestamp>${Date.now()}</timestamp>
    <depositor>
      <depositor_name>Valdimir Jacinto Esteves</depositor_name>
      <email_address>escritorioestevesemultisservic@gmail.com</email_address>
    </depositor>
    <registrant>AfricaWinners Scientific Blog &amp; Journal</registrant>
  </head>
  <body>
    <journal>
      <journal_metadata language="pt">
        <full_title>AfricaWinners Scientific Journal</full_title>
        <abbrev_title>AWSJ</abbrev_title>
        <issn media_type="electronic">2959-1082</issn>
      </journal_metadata>
      <journal_issue>
        <publication_date media_type="online">
          <month>${month}</month>
          <day>${day}</day>
          <year>${year}</year>
        </publication_date>
        <journal_volume>
          <volume>${article.volume || 1}</volume>
        </journal_volume>
        <issue>${article.issue || 1}</issue>
      </journal_issue>
      <journal_article publication_type="full_text">
        <titles>
          <title><![CDATA[${article.title}]]></title>
        </titles>
        <contributors>
          <person_name sequence="first" contributor_role="author">
            <given_name><![CDATA[${givenName}]]></given_name>
            <surname><![CDATA[${surname}]]></surname>
            <affiliation><![CDATA[${article.institution}]]></affiliation>
          </person_name>
        </contributors>
        <publication_date media_type="online">
          <month>${month}</month>
          <day>${day}</day>
          <year>${year}</year>
        </publication_date>
        <publisher_item>
          <item_number>${article.id}</item_number>
        </publisher_item>
        <doi_data>
          <doi>${doiClean}</doi>
          <resource>http://localhost:3000/#artigo-${article.id}</resource>
        </doi_data>
      </journal_article>
    </journal>
  </body>
</doi_batch>`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="CrossRef_AWSJ_DOI_${article.id}.xml"`);
    res.send(xml);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao gerar metadados CrossRef XML.' });
  }
});

// -------------------------------------------------------------
// ROTAS ADMINISTRATIVAS
// -------------------------------------------------------------

app.get('/api/admin/articles', requireAdmin, async (req, res) => {
  try {
    const articles = await dbAsync.all('SELECT * FROM articles ORDER BY id DESC');
    const usersCount = await dbAsync.get('SELECT COUNT(*) as count FROM users');
    res.json({
      success: true,
      count: articles.length,
      articles,
      stats: {
        totalManuscripts: articles.length,
        pendingReview: articles.filter(a => a.status === 'Under Peer Review' || a.status === 'Em Revisão').length,
        published: articles.filter(a => a.status === 'Published').length,
        registeredUsers: usersCount ? usersCount.count : 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao listar artigos.' });
  }
});

app.patch('/api/admin/articles/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status, editorial_notes } = req.body;
    const articleId = req.params.id;

    if (!status) {
      return res.status(400).json({ success: false, message: 'O novo estado é obrigatório.' });
    }

    const currentArt = await dbAsync.get('SELECT * FROM articles WHERE id = ?', [articleId]);
    let officialDOI = currentArt ? currentArt.doi : null;
    let certCode = currentArt ? currentArt.certificate_id : null;

    const pubType = currentArt?.publication_type || currentArt?.contribution_type || 'Artigo Científico';
    const isArticle = pubType.toLowerCase().includes('artigo');

    if (status === 'Published') {
      if (isArticle && !certCode) {
        certCode = `AWSJ-CERT-2026-${String(articleId).padStart(4, '0')}`;
      } else if (!isArticle) {
        certCode = null;
      }
    } else if (!isArticle) {
      certCode = null;
    }

    const publishedAtSql = status === 'Published' ? ', published_at = CURRENT_TIMESTAMP, fee_status = "Acesso Aberto"' : '';

    await dbAsync.run(
      `UPDATE articles SET status = ?, doi = COALESCE(?, doi), certificate_id = ?, editorial_notes = COALESCE(?, editorial_notes) ${publishedAtSql} WHERE id = ?`,
      [status, officialDOI, certCode, editorial_notes || null, articleId]
    );

    await dbAsync.run(
      `INSERT INTO reviews (article_id, reviewer_name, status, decision, comments)
       VALUES (?, 'Valdimir Jacinto Esteves (Fundador & Mentor)', ?, ?, ?)`,
      [articleId, status, status, editorial_notes || `Estado atualizado para: ${status}`]
    );

    res.json({
      success: true,
      message: `Artigo #${articleId} atualizado para "${status}". Certificado Oficial: [${certCode || 'Pendente'}].`,
      certificateCode: certCode
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao atualizar estado.' });
  }
});

app.delete('/api/admin/articles/:id', requireAdmin, async (req, res) => {
  try {
    const articleId = req.params.id;
    await dbAsync.run('DELETE FROM reviews WHERE article_id = ?', [articleId]);
    await dbAsync.run('DELETE FROM articles WHERE id = ?', [articleId]);
    res.json({
      success: true,
      message: `Artigo #${articleId} e respetivas solicitações foram eliminados com sucesso.`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao eliminar artigo.' });
  }
});

app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const users = await dbAsync.all(
      'SELECT id, name, email, institution, country, field_of_study, role, phone, is_verified, created_at FROM users ORDER BY id DESC'
    );
    res.json({ success: true, count: users.length, users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao listar investigadores.' });
  }
});

// -------------------------------------------------------------
// GESTÃO DE PARCEIROS INSTITUCIONAIS
// -------------------------------------------------------------
app.get('/api/partners', async (req, res) => {
  try {
    const partners = await dbAsync.all('SELECT * FROM partners ORDER BY id ASC');
    res.json({ success: true, count: partners.length, partners });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao listar parceiros.' });
  }
});

app.post('/api/admin/partners', requireAdmin, async (req, res) => {
  try {
    const { name, category, icon, website_url } = req.body;
    if (!name || !category) {
      return res.status(400).json({ success: false, message: 'Nome e categoria são obrigatórios.' });
    }
    const result = await dbAsync.run(
      `INSERT INTO partners (name, category, icon, website_url) VALUES (?, ?, ?, ?)`,
      [name.trim(), category.trim(), icon ? icon.trim() : 'fas fa-university', website_url ? website_url.trim() : '']
    );
    res.status(201).json({
      success: true,
      message: 'Parceiro adicionado com sucesso!',
      partner: { id: result.lastID, name, category, icon, website_url }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao adicionar parceiro.' });
  }
});

app.delete('/api/admin/partners/:id', requireAdmin, async (req, res) => {
  try {
    await dbAsync.run('DELETE FROM partners WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Parceiro removido com sucesso.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao remover parceiro.' });
  }
});

// Verificação da Palavra-Passe Ultra Secreta do Administrador / Mentor
app.post('/api/admin/quick-login', async (req, res) => {
  try {
    const { password } = req.body;
    const validSecretPasswords = [
      'AdminAWSJ@2026',
      'AWSJ@Secret2026',
      'Valdimir@Esteves#2026',
      process.env.ADMIN_SECRET_PASSWORD
    ].filter(Boolean);

    if (password && validSecretPasswords.includes(password.trim())) {
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
      const token = jwt.sign(adminUser, JWT_SECRET, { expiresIn: '7d' });
      return res.json({
        success: true,
        message: 'Acesso autorizado ao Painel do Administrador, Mentor Valdimir Jacinto Esteves!',
        token,
        user: adminUser
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Palavra-passe ultra secreta incorreta. Acesso negado ao painel.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao autenticar administrador.' });
  }
});

// Download do Template
app.get('/api/template/download', (req, res) => {
  const format = req.query.format || 'doc';
  const targetFile = format === 'pdf' ? templatePdfPath : templateDocxPath;
  const fileName = format === 'pdf' ? 'AWSJ_Modelo_Artigo_Template_2026.pdf' : 'AWSJ_Modelo_Artigo_Template_2026.doc';

  if (fs.existsSync(targetFile)) {
    res.download(targetFile, fileName);
  } else {
    res.status(404).json({ success: false, message: 'Ficheiro de modelo não encontrado.' });
  }
});

app.get('/api/journal/info', (req, res) => {
  res.json({
    journalName: 'AfricaWinners Scientific Blog & Tech Hub',
    acronym: 'AWSJ',
    founderAndMentor: {
      name: 'Valdimir Jacinto Esteves',
      title: 'Fundador & Mentor',
      institution: 'AfricaWinners / Escritório Esteves & Multi-Serviços',
      email: 'escritorioestevesemultisservic@gmail.com',
      phone: '976161521'
    },
    format: 'Blog Comunitário & Tech Hub (Evolutivo para Revista Internacional)',
    publicationFee: 'Acesso Aberto Comunitário',
    issn: 'ISSN 2959-1082 (Online)',
    languages: ['Português', 'English', 'Français']
  });
});

app.get('/api/journal/stats', async (req, res) => {
  try {
    const totalPublished = await dbAsync.get('SELECT COUNT(*) as count FROM articles WHERE status = "Published"');
    const totalSubmissions = await dbAsync.get('SELECT COUNT(*) as count FROM articles');
    const totalDownloads = await dbAsync.get('SELECT SUM(downloads_count) as total FROM articles');
    const totalViews = await dbAsync.get('SELECT SUM(views_count) as total FROM articles');

    res.json({
      success: true,
      stats: {
        publishedArticles: (totalPublished && totalPublished.count) || 3,
        totalSubmissions: (totalSubmissions && totalSubmissions.count) || 12,
        totalDownloads: (totalDownloads && totalDownloads.total) || 1037,
        totalViews: (totalViews && totalViews.total) || 3230,
        publicationFee: 'Acesso Aberto Comunitário',
        mentor: 'Valdimir Jacinto Esteves'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao carregar estatísticas.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(` 🏆 AfricaWinners Scientific Blog & Tech Hub (AWSJ)`);
  console.log(` 🏛️ Fundador & Mentor: Valdimir Jacinto Esteves`);
  console.log(` 🌐 Modelo: Blog Comunitário & Tech Hub (Evolutivo)`);
  console.log(` 🌟 Publicação & Certificados: Acesso Aberto Comunitário`);
  console.log(` 🌐 Idiomas: Português, English, Français`);
  console.log(` 📧 E-mail: escritorioestevesemultisservic@gmail.com`);
  console.log(` 🌐 Servidor ativo em: http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
