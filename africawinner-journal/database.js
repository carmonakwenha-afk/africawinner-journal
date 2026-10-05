/**
 * AfricaWinners Scientific Blog & Journal Hub (AWSJ) - Base de Dados SQLite
 * Fundador & Mentor: Valdimir Jacinto Esteves
 * Contacto: 976161521 | Email: escritorioestevesemultisservic@gmail.com
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, 'journal.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erro ao ligar à base de dados SQLite:', err.message);
  } else {
    console.log('✅ Base de dados SQLite ligada com sucesso em:', dbPath);
    initDatabase();
  }
});

function initDatabase() {
  db.serialize(() => {
    // Tabela de Utilizadores / Investigadores / Mentor Administrador
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        institution TEXT,
        country TEXT DEFAULT 'Angola',
        field_of_study TEXT,
        google_id TEXT UNIQUE,
        avatar_url TEXT,
        role TEXT DEFAULT 'Author',
        phone TEXT,
        is_verified INTEGER DEFAULT 1,
        verification_code TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de Artigos / Posts Científicos do Blog
    db.run(`
      CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        abstract TEXT NOT NULL,
        keywords TEXT,
        field TEXT NOT NULL,
        author_id INTEGER,
        author_name TEXT NOT NULL,
        institution TEXT NOT NULL,
        author_email TEXT NOT NULL,
        phone TEXT,
        pdf_path TEXT NOT NULL,
        pdf_original_name TEXT,
        status TEXT DEFAULT 'Published',
        doi TEXT,
        volume INTEGER DEFAULT 1,
        issue INTEGER DEFAULT 1,
        year INTEGER DEFAULT 2026,
        views_count INTEGER DEFAULT 0,
        downloads_count INTEGER DEFAULT 0,
        editorial_notes TEXT,
        certificate_id TEXT,
        fee_amount REAL DEFAULT 0.00,
        fee_status TEXT DEFAULT 'Acesso Aberto',
        published_by TEXT DEFAULT 'Author',
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (author_id) REFERENCES users (id)
      )
    `);

    // Adicionar colunas caso a tabela já exista de versão anterior
    const columnsToAdd = [
      { name: 'certificate_id', type: 'TEXT' },
      { name: 'fee_amount', type: 'REAL DEFAULT 0.00' },
      { name: 'fee_status', type: 'TEXT DEFAULT "Acesso Aberto"' },
      { name: 'published_by', type: 'TEXT DEFAULT "Author"' },
      { name: 'contribution_type', type: 'TEXT DEFAULT "Divulgação Científica"' },
      { name: 'publication_type', type: 'TEXT DEFAULT "Artigo Científico"' },
      { name: 'images', type: 'TEXT' },
      { name: 'video_url', type: 'TEXT' },
      { name: 'original_journal', type: 'TEXT' },
      { name: 'original_url', type: 'TEXT' }
    ];

    columnsToAdd.forEach(col => {
      db.run(`ALTER TABLE articles ADD COLUMN ${col.name} ${col.type}`, () => {
        // Silencioso se a coluna já existir
      });
    });

    // Manter artigos como acesso aberto comunitário e garantir regra de certificação exclusiva para Artigos Científicos
    db.run(`UPDATE articles SET fee_amount = 0.00, fee_status = 'Acesso Aberto'`);
    db.run(`UPDATE articles SET certificate_id = NULL WHERE publication_type != 'Artigo Científico'`);
    db.run(`UPDATE articles SET institution = 'Academia STEM AfricaWinners / AWSJ Hub' WHERE institution LIKE '%Agostinho Neto%'`);
    db.run(`UPDATE articles SET institution = 'Maker Lab Luanda / Hub Tecnológico Comunitário' WHERE institution LIKE '%ISPTEC%' OR institution LIKE '%Instituto Superior Politécnico%'`);

    // Tabela de Avaliações e Mentoria
    db.run(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id INTEGER NOT NULL,
        reviewer_name TEXT NOT NULL DEFAULT 'Comissão de Mentores AWSJ',
        status TEXT DEFAULT 'Concluído',
        decision TEXT,
        comments TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (article_id) REFERENCES articles (id)
      )
    `);

    // Tabela de Parceiros Institucionais (Universidades, Centros de Pesquisa, Polos Tech)
    db.run(`
      CREATE TABLE IF NOT EXISTS partners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        icon TEXT DEFAULT 'fas fa-university',
        website_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Garantir remoção de parceiros solicitados
    db.run(`DELETE FROM partners WHERE name LIKE '%Agostinho Neto%' OR name LIKE '%ISPTEC%'`);

    // Inserir parceiros institucionais padrão se a tabela estiver vazia
    db.get(`SELECT COUNT(*) as count FROM partners`, (err, row) => {
      if (row && row.count === 0) {
        const defaultPartners = [
          { name: 'Sociedades Científicas Africanas', category: 'Pesquisa & Patrimônio Acadêmico', icon: 'fas fa-book-reader', website_url: '#' },
          { name: 'Polos Tecnológicos & Startups STEM', category: 'Makers, Hardware & Inovação', icon: 'fas fa-microchip', website_url: '#' },
          { name: 'Municípios & Províncias Inovadoras', category: 'Impacto Comunitário & Extensão', icon: 'fas fa-city', website_url: '#' },
          { name: 'Escritório Esteves & Multi-Serviços', category: 'Coordenação Editorial & Mentoria', icon: 'fas fa-award', website_url: 'mailto:escritorioestevesemultisservic@gmail.com' }
        ];

        defaultPartners.forEach(p => {
          db.run(
            `INSERT INTO partners (name, category, icon, website_url) VALUES (?, ?, ?, ?)`,
            [p.name, p.category, p.icon, p.website_url]
          );
        });
        console.log('🤝 Parceiros institucionais iniciais configurados.');
      }
    });

    // Criar ou Atualizar Conta do Fundador & Mentor
    const adminEmail = 'escritorioestevesemultisservic@gmail.com';
    const adminPasswordRaw = 'AdminAWSJ@2026';
    const salt = bcrypt.genSaltSync(10);
    const adminHash = bcrypt.hashSync(adminPasswordRaw, salt);

    db.get(`SELECT id FROM users WHERE email = ?`, [adminEmail], (err, row) => {
      if (!row) {
        db.run(
          `INSERT INTO users (name, email, password_hash, institution, country, field_of_study, role, phone, is_verified)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            'Valdimir Jacinto Esteves',
            adminEmail,
            adminHash,
            'AfricaWinners / Escritório Esteves & Multi-Serviços',
            'Angola',
            'Inovação Tecnológica, Ciência & Mentoria Acadêmica',
            'Admin',
            '976161521'
          ],
          function(insertErr) {
            if (!insertErr) {
              console.log('⭐ Conta de Fundador & Mentor configurada (ID:', this.lastID, ')');
            }
          }
        );
      } else {
        db.run(
          `UPDATE users SET role = 'Admin', password_hash = ?, is_verified = 1 WHERE email = ?`,
          [adminHash, adminEmail]
        );
      }
    });

    // Inserir artigos exemplares se a tabela estiver vazia
    db.get(`SELECT COUNT(*) as count FROM articles`, (err, row) => {
      if (row && row.count === 0) {
        const initialArticles = [
          {
            title: 'Inteligência Artificial e Robótica Aplicadas à Educação Científica e Tecnológica de Base em África',
            abstract: 'Este estudo analisa o impacto da introdução precoce de módulos práticos de robótica educacional e algoritmos de visão computacional em escolas africanas. Os resultados apontam para um aumento de 64% na retenção de conceitos STEM e no desenvolvimento do pensamento crítico.',
            keywords: 'Inteligência Artificial, Robótica Educacional, STEM África, Pedagogia Tecnológica',
            field: 'Ciência da Computação & IA',
            author_name: 'Dr. Valdimir Jacinto Esteves & Investigadores Associados',
            institution: 'Academia STEM AfricaWinners / AWSJ Hub',
            author_email: 'escritorioestevesemultisservic@gmail.com',
            pdf_path: 'uploads/sample-article-1.pdf',
            pdf_original_name: 'AWSJ_Vol1_AI_Education_Esteves.pdf',
            publication_type: 'Artigo Científico',
            images: JSON.stringify(['assets/hero-science.jpg']),
            video_url: '',
            status: 'Published',
            doi: null,
            certificate_id: 'AWSJ-CERT-2026-001', // Apenas Artigos têm certificação
            fee_amount: 0.00,
            fee_status: 'Acesso Aberto',
            published_by: 'Admin',
            views_count: 1420,
            downloads_count: 485
          },
          {
            title: 'Da Oficina de Bairro ao Reconhecimento Acadêmico: A Trajetória de Superação de Jovens Makers em Luanda',
            abstract: 'Um relato inspirador sobre como três jovens do município de Cazenga superaram escassez de recursos laboratoriais para construir sensores ambientais de baixo custo a partir de lixo eletrônico reciclado, inspirando dezenas de estudantes a ingressarem na engenharia.',
            keywords: 'Superação, Makers, Inclusão Social, Reciclagem Tecnológica, Angola',
            field: 'Educação Científica & STEM',
            author_name: 'Manuel Kalandula (Líder Comunitário Maker)',
            institution: 'Núcleo Juvenil de Robótica do Cazenga',
            author_email: 'kalandula.maker@gmail.com',
            pdf_path: null,
            pdf_original_name: null,
            publication_type: 'História de Vencedor',
            images: JSON.stringify(['assets/hero-science.jpg']),
            video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            status: 'Published',
            doi: null,
            certificate_id: null, // Sem certificação
            fee_amount: 0.00,
            fee_status: 'Acesso Aberto',
            published_by: 'Admin',
            views_count: 1210,
            downloads_count: 0
          },
          {
            title: 'I Jornada Comunitária de Robótica e Astronomia: Capacitação Prática de 250 Crianças e Jovens',
            abstract: 'Registo fotográfico e audiovisual da primeira jornada de popularização da ciência astronômica e robótica para o ensino primário e secundário. O evento reuniu oficinas de montagem de telescópios artesanais e circuitos básicos de automação sem necessidade de documentos formais.',
            keywords: 'Jornada Científica, Robótica, Astronomia Comunitária, Extensão Acadêmica',
            field: 'Educação Científica & STEM',
            author_name: 'Comissão Organizadora AfricaWinners & Voluntários STEM',
            institution: 'Escritório Esteves & Multi-Serviços / AfricaWinners',
            author_email: 'escritorioestevesemultisservic@gmail.com',
            pdf_path: null,
            pdf_original_name: null,
            publication_type: 'Actividade',
            images: JSON.stringify(['assets/hero-science.jpg']),
            video_url: '',
            status: 'Published',
            doi: null,
            certificate_id: null, // Sem certificação
            fee_amount: 0.00,
            fee_status: 'Acesso Aberto',
            published_by: 'Admin',
            views_count: 980,
            downloads_count: 0
          },
          {
            title: 'Protótipo Maker de Incubadora Automatizada de Baixo Custo com Sensores IoT para Agricultura Familiar',
            abstract: 'Demonstração de um protótipo funcional de incubadora térmica com controlo PID implementado em microcontroladores ESP32 e monitoramento remoto por aplicativo mobile, desenvolvido para pequenos avicultores periféricos.',
            keywords: 'IoT, Hardware Aberto, Agricultura Familiar, Automação, Prototipagem',
            field: 'Biotecnologia & Agrociências',
            author_name: 'Eng. K. Mensah & Maker Lab Luanda',
            institution: 'Maker Lab Luanda / Hub Tecnológico Comunitário',
            author_email: 'k.mensah@makerlab.ao',
            pdf_path: null,
            pdf_original_name: null,
            publication_type: 'Projecto',
            images: JSON.stringify(['assets/hero-science.jpg']),
            video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            status: 'Published',
            doi: null,
            certificate_id: null, // Sem certificação
            fee_amount: 0.00,
            fee_status: 'Acesso Aberto',
            published_by: 'Admin',
            views_count: 1650,
            downloads_count: 0
          }
        ];

        initialArticles.forEach(art => {
          db.run(
            `INSERT INTO articles (title, abstract, keywords, field, author_name, institution, author_email, pdf_path, pdf_original_name, status, doi, certificate_id, fee_amount, fee_status, published_by, publication_type, images, video_url, views_count, downloads_count, published_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [
              art.title, art.abstract, art.keywords, art.field,
              art.author_name, art.institution, art.author_email,
              art.pdf_path, art.pdf_original_name, art.status, art.doi,
              art.certificate_id, art.fee_amount, art.fee_status, art.published_by,
              art.publication_type, art.images, art.video_url,
              art.views_count, art.downloads_count
            ]
          );
        });
        console.log('📚 Artigos exemplares do Blog inseridos com acesso aberto comunitário (certificação exclusiva para Artigos).');
      }
    });
  });
}

// Wrapper de Promessas para operações no SQLite
const dbAsync = {
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
};

module.exports = {
  db,
  dbAsync
};
