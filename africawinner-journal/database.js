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
        pdf_path TEXT,
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

    // Base de dados de artigos limpa: sem artigos fictícios nem métricas falsas
    console.log('✅ Base de dados limpa e pronta.');
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
