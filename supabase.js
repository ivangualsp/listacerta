import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Inicializar cliente Supabase com as credenciais
const supabaseUrl = 'https://fqbolzbvfrqulgbvckso.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxYm9semJ2ZnJxdWxnYnZja3NvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1MjA2ODcsImV4cCI6MjA2MTA5NjY4N30.yHXxhuciT0zxgk_tkkp4yEIKthZylUmghiUcjJKbSoM';

const supabase = createClient(supabaseUrl, supabaseKey);

// Funções de autenticação
async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
}

async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  return { data, error };
}

// Funções para manipular os itens da lista de compras
async function getItems() {
  const { data, error } = await supabase
    .from('shopping_items')
    .select('*')
    .order('created_at', { ascending: false });
  
  return { data, error };
}

async function addItem(item) {
  console.log('Tentando adicionar item:', item);
  
  // Verificar autenticação
  const { data: { session } } = await supabase.auth.getSession();
  console.log('Status da sessão:', session ? 'Autenticado' : 'Não autenticado');
  
  if (!session) {
    console.error('Erro: Usuário não autenticado ao tentar adicionar item');
    return { error: { message: 'Usuário não autenticado' } };
  }
  
  // Adicionar o ID do usuário ao item
  item.user_id = session.user.id;
  console.log('Adicionando item com user_id:', item.user_id);
  
  const { data, error } = await supabase
    .from('shopping_items')
    .insert([item])
    .select();
  
  if (error) {
    console.error('Erro ao adicionar item no Supabase:', error);
    // Verificar detalhes do erro para ajudar no diagnóstico
    if (error.code === '42501') {
      console.error('Erro de permissão: RLS impediu a operação');
    } else if (error.code === '23505') {
      console.error('Erro de duplicação: O item já existe');
    }
    return { error };
  }
  
  console.log('Item adicionado com sucesso:', data);
  return { data };
}

async function updateItem(id, updates) {
  const { data, error } = await supabase
    .from('shopping_items')
    .update(updates)
    .eq('id', id)
    .select();
  
  return { data, error };
}

async function deleteItem(id) {
  const { error } = await supabase
    .from('shopping_items')
    .delete()
    .eq('id', id);
  
  return { error };
}

async function clearCompletedItems() {
  const { error } = await supabase
    .from('shopping_items')
    .delete()
    .eq('completed', true);
  
  return { error };
}

export {
  supabase,
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  getItems,
  addItem,
  updateItem,
  deleteItem,
  clearCompletedItems
}; 