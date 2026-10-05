# ==============================================================================
# ☁️ SCRIPT DE DEPLOY NO GOOGLE CLOUD (POWERSHELL)
# AfricaWinners Scientific Blog & Tech Hub (AWSJ)
# ==============================================================================

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " 🚀 AfricaWinners - Deploy no Google Cloud Run" -ForegroundColor Yellow
Write-Host " 🏛️ Fundador & Mentor: Valdimir Jacinto Esteves" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Cyan

# Verificar se gcloud CLI está instalado
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "`n⚠️ O utilitário 'gcloud' não foi encontrado instalado no seu Windows." -ForegroundColor Yellow
    Write-Host "💡 DICA RÁPIDA: Você pode fazer o deploy sem instalar nada pelo navegador!" -ForegroundColor Green
    Write-Host "   1. Abra o navegador em: https://console.cloud.google.com" -ForegroundColor Cyan
    Write-Host "   2. Clique no ícone do Cloud Shell (>_) no topo direito" -ForegroundColor Cyan
    Write-Host "   3. Envie a pasta do projeto e execute:" -ForegroundColor White
    Write-Host "      gcloud run deploy africawinner-hub --source . --region europe-west1 --allow-unauthenticated" -ForegroundColor Green
    Write-Host "`nConsulte o passo-a-passo detalhado em DEPLOY_GOOGLE_CLOUD.md" -ForegroundColor Gray
    Read-Host "`nPressione Enter para sair..."
    exit
}

Write-Host "`n1. Verificando autenticação no Google Cloud..." -ForegroundColor Cyan
gcloud auth list

$serviceName = "africawinner-hub"
$region = "europe-west1"

Write-Host "`n2. Iniciando Deploy para o Google Cloud Run ($serviceName na região $region)..." -ForegroundColor Cyan

gcloud run deploy $serviceName `
  --source . `
  --region $region `
  --allow-unauthenticated `
  --set-env-vars NODE_ENV=production,JWT_SECRET=awsj_scientific_secret_esteves_2026,JOURNAL_FOUNDER="Valdimir Jacinto Esteves",JOURNAL_PHONE="976161521",JOURNAL_EMAIL="escritorioestevesemultisservic@gmail.com"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n🎉 DEPLOY CONCLUÍDO COM SUCESSO NO GOOGLE CLOUD!" -ForegroundColor Green
    Write-Host "O portal da AfricaWinners já está online e com certificado SSL oficial da Google." -ForegroundColor Yellow
} else {
    Write-Host "`n❌ Ocorreu um erro no processo de deploy." -ForegroundColor Red
}
