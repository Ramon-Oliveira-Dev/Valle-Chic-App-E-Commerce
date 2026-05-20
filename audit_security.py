import os
import re
import subprocess
import json
import sys

# Cores para output
RED = '\033[91m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
RESET = '\033[0m'

def run_pip_audit():
    print(f"\n{YELLOW}[*] Executando pip-audit...{RESET}")
    try:
        # Verifica se o pip-audit está instalado
        subprocess.run(["pip-audit", "--version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        result = subprocess.run(["pip-audit"], capture_output=True, text=True)
        print(result.stdout)
        if result.stderr:
            print(f"{RED}Erros no pip-audit:{RESET}\n", result.stderr)
    except FileNotFoundError:
        print(f"{RED}[!] pip-audit não encontrado. Instale com: pip install pip-audit{RESET}")
    except subprocess.CalledProcessError as e:
        print(f"{RED}[!] Vulnerabilidades Python encontradas!{RESET}")
        print(e.stdout)

def run_npm_audit():
    print(f"\n{YELLOW}[*] Executando npm audit (Análise de CVEs no package.json)...{RESET}")
    try:
        result = subprocess.run(["npm", "audit", "--json"], capture_output=True, text=True)
        audit_data = json.loads(result.stdout)
        
        vulnerabilities = audit_data.get('metadata', {}).get('vulnerabilities', {})
        total_vulns = sum(vulnerabilities.values())
        
        if total_vulns > 0:
            print(f"{RED}[!] Foram encontradas {total_vulns} vulnerabilidades no Node.js!{RESET}")
            print(f"  - Críticas: {vulnerabilities.get('critical', 0)}")
            print(f"  - Altas: {vulnerabilities.get('high', 0)}")
            print(f"  - Moderadas: {vulnerabilities.get('moderate', 0)}")
            print(f"  - Baixas: {vulnerabilities.get('low', 0)}")
            print(f"{YELLOW}Execute 'npm audit' no terminal para ver os detalhes.{RESET}")
        else:
            print(f"{GREEN}[+] Nenhuma vulnerabilidade encontrada nas dependências do Node.js.{RESET}")
            
    except Exception as e:
        print(f"{RED}[!] Erro ao executar npm audit: {e}{RESET}")

def scan_secrets():
    print(f"\n{YELLOW}[*] Iniciando Secret Scan (Buscando chaves do Supabase vazadas)...{RESET}")
    
    # Regex para chaves JWT típicas do Supabase (começam com eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9)
    supabase_jwt_pattern = re.compile(r'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+')
    
    # Extensões para verificar
    extensions = ('.ts', '.tsx', '.js', '.jsx', '.json', '.txt', '.log')
    # Diretórios para ignorar
    ignore_dirs = ('node_modules', 'dist', '.git', '.next')
    
    found_secrets = False
    
    for root, dirs, files in os.walk('.'):
        # Remove diretórios ignorados
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        
        for file in files:
            if file.endswith(extensions) and file != 'package-lock.json':
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                        
                        # Verifica chaves JWT
                        matches = supabase_jwt_pattern.findall(content)
                        if matches:
                            # Ignora se estiver no arquivo .env de exemplo
                            if 'env.example' not in filepath:
                                print(f"{RED}[!] ALERTA CRÍTICO: Possível chave JWT do Supabase encontrada em: {filepath}{RESET}")
                                found_secrets = True
                                
                        # Verifica menções diretas a service_role
                        if 'service_role' in content.lower() and 'supabase' in content.lower():
                            print(f"{YELLOW}[!] Aviso: Menção a 'service_role' encontrada em: {filepath}. Verifique se não há chaves hardcoded.{RESET}")
                            
                except Exception:
                    pass # Ignora arquivos que não podem ser lidos como texto

    if not found_secrets:
        print(f"{GREEN}[+] Nenhuma chave JWT do Supabase exposta em texto simples no código.{RESET}")

if __name__ == "__main__":
    print("==================================================")
    print("  AUDITORIA DE SEGURANÇA - VALLE CHIC ERP")
    print("==================================================")
    run_npm_audit()
    run_pip_audit()
    scan_secrets()
    print("\n==================================================")
    print("  AUDITORIA CONCLUÍDA")
    print("==================================================")
