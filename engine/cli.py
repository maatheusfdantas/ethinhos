"""
Interface de Linha de Comando (CLI) da Engine Analítica do Ethos
Permite execução direta: py -3.12 -m engine.cli <user_id>
Imprime JSON padronizado na saída padrão (stdout).
"""

import sys
import json
from engine.service import run_analytics_for_user

def main():
    if len(sys.argv) < 2:
        user_id = "usr_matheus_pro"
    else:
        user_id = sys.argv[1]

    try:
        result = run_analytics_for_user(user_id)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except Exception as e:
        error_resp = {
            "error": str(e),
            "user_id": user_id
        }
        print(json.dumps(error_resp, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
