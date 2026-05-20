// ==================== UTILITÁRIOS GLOBAIS ====================

export const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export const CATEGORIAS_PF = {
    entrada: [
        { id: 'pf_ent_salario',       nome: 'Salário',          cor: '#10B981' },
        { id: 'pf_ent_freelance',     nome: 'Freelance',        cor: '#22C55E' },
        { id: 'pf_ent_investimentos', nome: 'Investimentos',    cor: '#059669' },
        { id: 'pf_ent_presente',      nome: 'Presente',         cor: '#3B82F6' },
        { id: 'pf_ent_outros',        nome: 'Outras Entradas',  cor: '#6B7280' }
    ],
    saida: [
        { id: 'pf_sai_moradia',       nome: 'Moradia',          cor: '#EF4444' },
        { id: 'pf_sai_alimentacao',   nome: 'Alimentação',      cor: '#F97316' },
        { id: 'pf_sai_transporte',    nome: 'Transporte',       cor: '#F59E0B' },
        { id: 'pf_sai_saude',         nome: 'Saúde',            cor: '#EC4899' },
        { id: 'pf_sai_educacao',      nome: 'Educação',         cor: '#8B5CF6' },
        { id: 'pf_sai_lazer',         nome: 'Lazer',            cor: '#6366F1' },
        { id: 'pf_sai_vestuario',     nome: 'Vestuário',        cor: '#14B8A6' },
        { id: 'pf_sai_outros',        nome: 'Outras Saídas',    cor: '#6B7280' }
    ]
};

export const CATEGORIAS_PJ = {
    entrada: [
        { id: 'pj_ent_receita_op',    nome: 'Receita Operacional',  cor: '#10B981' },
        { id: 'pj_ent_servicos',      nome: 'Venda de Serviços',    cor: '#22C55E' },
        { id: 'pj_ent_produtos',      nome: 'Venda de Produtos',    cor: '#059669' },
        { id: 'pj_ent_financeira',    nome: 'Receita Financeira',   cor: '#3B82F6' },
        { id: 'pj_ent_outras',        nome: 'Outras Receitas',      cor: '#6B7280' }
    ],
    saida: [
        { id: 'pj_sai_cmv',           nome: 'CMV',                  cor: '#EF4444' },
        { id: 'pj_sai_folha',         nome: 'Folha de Pagamento',   cor: '#F97316' },
        { id: 'pj_sai_impostos',      nome: 'Impostos e Taxas',     cor: '#F59E0B' },
        { id: 'pj_sai_aluguel',       nome: 'Aluguel',              cor: '#EC4899' },
        { id: 'pj_sai_energia',       nome: 'Energia Elétrica',     cor: '#8B5CF6' },
        { id: 'pj_sai_agua',          nome: 'Água e Esgoto',        cor: '#6366F1' },
        { id: 'pj_sai_internet',      nome: 'Internet e Telefone',  cor: '#14B8A6' },
        { id: 'pj_sai_marketing',     nome: 'Marketing',            cor: '#D946EF' },
        { id: 'pj_sai_manutencao',    nome: 'Manutenção',           cor: '#F43F5E' },
        { id: 'pj_sai_materiais',     nome: 'Materiais de Escritório', cor: '#0EA5E9' },
        { id: 'pj_sai_viagens',       nome: 'Viagens e Refeições',  cor: '#84CC16' },
        { id: 'pj_sai_bancarias',     nome: 'Despesas Bancárias',   cor: '#A855F7' },
        { id: 'pj_sai_outros',        nome: 'Outros Custos',        cor: '#6B7280' }
    ]
};

// --- Formatação ---
export function formatarMoeda(v) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);
}

export function formatarData(iso) {
    if (!iso) return '-';
    const [a, m, d] = iso.split('-');
    return `${d}/${m}/${a}`;
}

export function dataParaISO(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function criarDataLocal(iso) {
    if (!iso) return null;
    const [a, m, d] = iso.split('-').map(Number);
    return new Date(a, m-1, d);
}

export function escaparHtml(t) {
    return String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

export function gerarId(p = 'id') {
    return `${p}_${Date.now()}_${Math.random().toString(16).slice(2,8)}`;
}

export function limparNumeros(v) { return String(v||'').replace(/\D/g,''); }

export function parseNum(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

// --- Máscara ---
export function mascararCPF(v) {
    const n = limparNumeros(v).slice(0,11);
    return n.replace(/^(\d{3})(\d)/,'$1.$2')
            .replace(/^(\d{3})\.(\d{3})(\d)/,'$1.$2.$3')
            .replace(/\.(\d{3})(\d)/,'.$1-$2');
}

export function mascararCNPJ(v) {
    const n = limparNumeros(v).slice(0,14);
    return n.replace(/^(\d{2})(\d)/,'$1.$2')
            .replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3')
            .replace(/\.(\d{3})(\d)/,'.$1/$2')
            .replace(/(\d{4})(\d)/,'$1-$2');
}

// --- Validações ---
export function validarCPF(cpf) {
    const v = limparNumeros(cpf);
    if (v.length !== 11 || /^(\d)\1{10}$/.test(v)) return false;
    let s = 0;
    for (let i=0;i<9;i++) s += +v[i]*(10-i);
    let d = 11-(s%11); if (d>9) d=0;
    if (d !== +v[9]) return false;
    s=0;
    for (let i=0;i<10;i++) s += +v[i]*(11-i);
    d = 11-(s%11); if (d>9) d=0;
    return d === +v[10];
}

export function validarCNPJ(cnpj) {
    const v = limparNumeros(cnpj);
    if (v.length !== 14 || /^(\d)\1{13}$/.test(v)) return false;
    const calc = (n, p) => {
        const s = n.split('').reduce((a,c,i)=>a + +c*p[i], 0);
        const r = s%11; return r<2?0:11-r;
    };
    const p1=[5,4,3,2,9,8,7,6,5,4,3,2], p2=[6,5,4,3,2,9,8,7,6,5,4,3,2];
    const d1=calc(v.slice(0,12),p1), d2=calc(v.slice(0,12)+d1,p2);
    return `${d1}${d2}` === v.slice(12);
}

// --- Tema ---
export function aplicarTema(tema) {
    document.documentElement.setAttribute('data-theme', tema || 'roxo');
    localStorage.setItem('gerencia_tema', tema || 'roxo');
}

export function carregarTema() {
    const tema = localStorage.getItem('gerencia_tema') || 'roxo';
    aplicarTema(tema);
    return tema;
}

// --- Alertas ---
export function mostrarAlerta(id, msg, tipo='error') {
    const el = document.getElementById(id);
    if (!el) { alert(msg); return; }
    el.textContent = msg;
    el.className = `alert alert-${tipo}`;
    el.style.display = 'block';
}

export function esconderAlerta(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
}

// --- Toast ---
export function toast(msg, tipo='success') {
    const t = document.createElement('div');
    t.style.cssText = `
        position:fixed;bottom:24px;right:24px;z-index:9999;
        background:${tipo==='error'?'#EF4444':tipo==='warning'?'#F59E0B':'#10B981'};
        color:#fff;padding:12px 20px;border-radius:10px;
        font-weight:600;font-size:14px;font-family:var(--font-body);
        box-shadow:0 8px 24px rgba(0,0,0,0.2);
        animation:slideUp 0.3s ease;
        max-width:320px;
    `;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

// --- Meses ---
export function montarUltimosMeses(qtd = 6) {
    const meses = [], hoje = new Date();
    for (let i = qtd-1; i >= 0; i--) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth()-i, 1);
        meses.push({
            chave: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
            label:  `${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`
        });
    }
    return meses;
}

export function listarMesesNoIntervalo(inicioIso, fimIso) {
    const inicio = criarDataLocal(inicioIso), fim = criarDataLocal(fimIso);
    if (!inicio || !fim) return [];
    const meses = [];
    const cur = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
    const lim = new Date(fim.getFullYear(), fim.getMonth(), 1);
    while (cur <= lim) {
        meses.push({
            chave: `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}`,
            label: `${MESES[cur.getMonth()]}/${String(cur.getFullYear()).slice(-2)}`
        });
        cur.setMonth(cur.getMonth()+1);
    }
    return meses;
}

// --- CSV Export ---
export function exportarCSV(lancamentos, categoriasMap, contasMap, nomeArquivo) {
    if (!lancamentos.length) { toast('Nenhum dado para exportar.','warning'); return; }
    const cab = ['Data','Tipo','Descrição','Categoria','Conta','Valor','Observação'];
    const linhas = [cab.map(c=>`"${c}"`).join(';')];
    lancamentos.forEach(l => {
        linhas.push([
            formatarData(l.data),
            l.tipo === 'entrada' ? 'Entrada' : 'Saída',
            l.descricao,
            categoriasMap[l.categoriaId]?.nome || 'Sem categoria',
            contasMap[l.contaId]?.nome || 'Conta removida',
            l.valor.toFixed(2).replace('.',','),
            l.observacao || ''
        ].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(';'));
    });
    const blob = new Blob(['\uFEFF'+linhas.join('\n')], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nomeArquivo;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
}