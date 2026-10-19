# Leitura de Arquivos OFX com Python

Lê um extrato bancário `.ofx`, exibe as movimentações com os totais e (desafio extra) grava tudo em um PostgreSQL no Neon.

## Como rodar

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

python main.py   # exibe o extrato, entradas, saídas e saldo
python db.py     # grava no PostgreSQL (precisa do .env)
```

### Interface web (React)

```bash
python api.py                         # terminal 1: API em localhost:8000
cd web && npm install && npm run dev  # terminal 2: abra http://localhost:5173
```

Mostra o saldo, o gráfico do saldo acumulado, entradas, saídas e as movimentações salvas no Neon. O botão "Importar arquivo .ofx" (ou arrastar o arquivo) grava no banco sem duplicar.

Para o `db.py` e a API, copie `.env.example` para `.env` e preencha `DATABASE_URL` com a connection string do Neon.

## Desafio extra: PostgreSQL

Tabela `movimentacoes` criada no Neon. Além das colunas do enunciado, tem `fitid` (identificador único da transação no OFX) com `UNIQUE`. Com `ON CONFLICT DO NOTHING`, rodar o `db.py` de novo não duplica registros.

![Estrutura da tabela movimentacoes no Neon](docs/tabela-neon.png)

Registros gravados (15 movimentações do `extrato.ofx`):

![Dados da tabela movimentacoes no Neon](docs/dados-neon.png)
