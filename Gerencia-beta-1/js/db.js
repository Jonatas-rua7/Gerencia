// ==================== SERVIÇO DE BANCO DE DADOS (FIRESTORE) ====================
import { auth, db } from './firebase-config.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updatePassword,
    updateEmail,
    EmailAuthProvider,
    reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
    doc, setDoc, getDoc, updateDoc, deleteDoc,
    collection, query, where, getDocs, addDoc,
    orderBy, serverTimestamp, writeBatch, limit
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { CATEGORIAS_PF, CATEGORIAS_PJ, gerarId } from './utils.js';

// ========== AUTH ==========

export async function registrar({ nome, email, senha, tipo, cpf, cnpj, razaoSocial, nomeFantasia, inscricaoEstadual }) {
    const cred = await createUserWithEmailAndPassword(auth, email, senha);
    const uid = cred.user.uid;

    const perfil = {
        uid, nome, email, tipo,
        cpf: tipo === 'PF' ? cpf : '',
        cnpj: tipo === 'PJ' ? cnpj : '',
        razaoSocial: tipo === 'PJ' ? razaoSocial : '',
        nomeFantasia: tipo === 'PJ' ? nomeFantasia : '',
        inscricaoEstadual: tipo === 'PJ' ? inscricaoEstadual : '',
        role: 'user',      // 'user' | 'adm'
        bloqueado: false,
        criadoEm: serverTimestamp()
    };

    await setDoc(doc(db, 'usuarios', uid), perfil);

    // Criar conta padrão
    await addDoc(collection(db, 'contas'), {
        usuarioId: uid,
        nome: tipo === 'PJ' ? 'Conta Empresarial' : 'Conta Principal',
        saldoInicial: 0,
        criadoEm: serverTimestamp()
    });

    // Criar categorias padrão
    const cats = tipo === 'PJ' ? CATEGORIAS_PJ : CATEGORIAS_PF;
    const batch = writeBatch(db);
    [...cats.entrada.map(c=>({...c,tipo:'entrada'})), ...cats.saida.map(c=>({...c,tipo:'saida'}))].forEach(cat => {
        const ref = doc(collection(db, 'categorias'));
        batch.set(ref, { ...cat, usuarioId: uid, padrao: true, criadoEm: serverTimestamp() });
    });
    await batch.commit();

    return perfil;
}

export async function login(email, senha) {
    const cred = await signInWithEmailAndPassword(auth, email, senha);
    const perfil = await obterPerfil(cred.user.uid);
    if (perfil?.bloqueado) {
        await logoutUsuario();
        throw new Error('Conta bloqueada. Entre em contato com o administrador.');
    }
    return perfil;
}

export async function logoutUsuario() {
    await signOut(auth);
}

export function usuarioAtual() {
    return auth.currentUser;
}

// ========== PERFIL ==========

export async function obterPerfil(uid) {
    const snap = await getDoc(doc(db, 'usuarios', uid));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function atualizarPerfil(uid, dados) {
    await updateDoc(doc(db, 'usuarios', uid), dados);
}

export async function alterarSenha(senhaAtual, novaSenha) {
    const user = auth.currentUser;
    const cred = EmailAuthProvider.credential(user.email, senhaAtual);
    await reauthenticateWithCredential(user, cred);
    await updatePassword(user, novaSenha);
}

export async function alterarEmail(senhaAtual, novoEmail) {
    const user = auth.currentUser;
    const cred = EmailAuthProvider.credential(user.email, senhaAtual);
    await reauthenticateWithCredential(user, cred);
    await updateEmail(user, novoEmail);
    await updateDoc(doc(db, 'usuarios', user.uid), { email: novoEmail });
}

// ========== CONTAS BANCÁRIAS ==========

export async function listarContas(usuarioId) {
    const q = query(collection(db, 'contas'), where('usuarioId', '==', usuarioId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function criarConta(usuarioId, dados) {
    const ref = await addDoc(collection(db, 'contas'), {
        usuarioId,
        nome: dados.nome,
        saldoInicial: Number(dados.saldoInicial) || 0,
        criadoEm: serverTimestamp()
    });
    return { id: ref.id, usuarioId, ...dados };
}

export async function editarConta(contaId, dados) {
    await updateDoc(doc(db, 'contas', contaId), dados);
}

export async function excluirConta(contaId) {
    await deleteDoc(doc(db, 'contas', contaId));
}

// ========== CATEGORIAS ==========

export async function listarCategorias(usuarioId) {
    const q = query(collection(db, 'categorias'), where('usuarioId', '==', usuarioId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function criarCategoria(usuarioId, dados) {
    const ref = await addDoc(collection(db, 'categorias'), {
        usuarioId,
        nome: dados.nome,
        tipo: dados.tipo,
        cor: dados.cor || '#6B7280',
        padrao: false,
        criadoEm: serverTimestamp()
    });
    return { id: ref.id, ...dados };
}

export async function editarCategoria(catId, dados) {
    await updateDoc(doc(db, 'categorias', catId), dados);
}

export async function excluirCategoria(catId) {
    await deleteDoc(doc(db, 'categorias', catId));
}

// ========== LANÇAMENTOS ==========

export async function listarLancamentos(usuarioId) {
    const q = query(
        collection(db, 'lancamentos'),
        where('usuarioId', '==', usuarioId),
        orderBy('data', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function criarLancamento(usuarioId, dados) {
    const ref = await addDoc(collection(db, 'lancamentos'), {
        usuarioId,
        tipo: dados.tipo,
        descricao: dados.descricao,
        valor: Number(dados.valor),
        data: dados.data,
        categoriaId: dados.categoriaId,
        contaId: dados.contaId,
        observacao: dados.observacao || '',
        criadoEm: serverTimestamp()
    });
    return { id: ref.id, ...dados };
}

export async function excluirLancamento(id) {
    await deleteDoc(doc(db, 'lancamentos', id));
}

// ========== ADM ==========

export async function listarTodosUsuarios() {
    const snap = await getDocs(collection(db, 'usuarios'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function bloquearUsuario(uid) {
    await updateDoc(doc(db, 'usuarios', uid), { bloqueado: true });
}

export async function desbloquearUsuario(uid) {
    await updateDoc(doc(db, 'usuarios', uid), { bloqueado: false });
}

export async function excluirUsuario(uid) {
    // Remove dados do usuário (lançamentos, contas, categorias, perfil)
    const batch = writeBatch(db);

    for (const col of ['lancamentos', 'contas', 'categorias']) {
        const q = query(collection(db, col), where('usuarioId', '==', uid));
        const snap = await getDocs(q);
        snap.docs.forEach(d => batch.delete(d.ref));
    }
    batch.delete(doc(db, 'usuarios', uid));
    await batch.commit();
}

export async function listarTodosLancamentos() {
    const snap = await getDocs(collection(db, 'lancamentos'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function listarCategorias_Global() {
    const snap = await getDocs(query(collection(db, 'categorias_globais')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function criarCategoriaGlobal(dados) {
    await addDoc(collection(db, 'categorias_globais'), {
        ...dados,
        criadoEm: serverTimestamp()
    });
}

export async function excluirCategoriaGlobal(id) {
    await deleteDoc(doc(db, 'categorias_globais', id));
}

export async function tornarAdm(uid) {
    await updateDoc(doc(db, 'usuarios', uid), { role: 'adm' });
}

export async function revogarAdm(uid) {
    await updateDoc(doc(db, 'usuarios', uid), { role: 'user' });
}