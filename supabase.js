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

// Funções para gerenciar as listas de compras salvas
async function saveShoppingList(shoppingList) {
  console.log('Salvando lista de compras:', shoppingList);
  
  // Verificar autenticação
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    console.error('Erro: Usuário não autenticado ao tentar salvar lista');
    return { error: { message: 'Usuário não autenticado' } };
  }
  
  // Adicionar o ID do usuário à lista
  shoppingList.user_id = session.user.id;
  
  // Salvar a lista principal
  const { data: listData, error: listError } = await supabase
    .from('shopping_lists')
    .insert([{
      store_name: shoppingList.store_name,
      purchase_date: shoppingList.purchase_date,
      notes: shoppingList.notes,
      total_price: shoppingList.total_price,
      user_id: shoppingList.user_id
    }])
    .select();
  
  if (listError) {
    console.error('Erro ao salvar lista:', listError);
    return { error: listError };
  }
  
  const list_id = listData[0].id;
  
  // Salvar os itens da lista
  const itemsWithListId = shoppingList.items.map(item => ({
    ...item,
    list_id: list_id,
    user_id: session.user.id
  }));
  
  const { error: itemsError } = await supabase
    .from('shopping_list_items')
    .insert(itemsWithListId);
  
  if (itemsError) {
    console.error('Erro ao salvar itens da lista:', itemsError);
    // Se falhar ao salvar os itens, exclui a lista principal
    await supabase.from('shopping_lists').delete().eq('id', list_id);
    return { error: itemsError };
  }
  
  return { data: listData };
}

async function getSavedLists() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return { error: { message: 'Usuário não autenticado' } };
  }
  
  const { data, error } = await supabase
    .from('shopping_lists')
    .select('*')
    .eq('user_id', session.user.id)
    .order('purchase_date', { ascending: false });
  
  return { data, error };
}

async function getSavedListDetails(listId) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return { error: { message: 'Usuário não autenticado' } };
  }
  
  // Obter a lista principal
  const { data: listData, error: listError } = await supabase
    .from('shopping_lists')
    .select('*')
    .eq('id', listId)
    .eq('user_id', session.user.id)
    .single();
  
  if (listError) {
    console.error('Erro ao obter detalhes da lista:', listError);
    return { error: listError };
  }
  
  // Obter os itens da lista
  const { data: itemsData, error: itemsError } = await supabase
    .from('shopping_list_items')
    .select('*')
    .eq('list_id', listId)
    .eq('user_id', session.user.id);
  
  if (itemsError) {
    console.error('Erro ao obter itens da lista:', itemsError);
    return { error: itemsError };
  }
  
  return { 
    data: {
      ...listData,
      items: itemsData
    }
  };
}

async function deleteSavedList(listId) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return { error: { message: 'Usuário não autenticado' } };
  }
  
  // Primeiro excluir os itens relacionados
  const { error: itemsError } = await supabase
    .from('shopping_list_items')
    .delete()
    .eq('list_id', listId)
    .eq('user_id', session.user.id);
  
  if (itemsError) {
    console.error('Erro ao excluir itens da lista:', itemsError);
    return { error: itemsError };
  }
  
  // Depois excluir a lista principal
  const { error: listError } = await supabase
    .from('shopping_lists')
    .delete()
    .eq('id', listId)
    .eq('user_id', session.user.id);
  
  if (listError) {
    console.error('Erro ao excluir lista:', listError);
    return { error: listError };
  }
  
  return { success: true };
}

// Exportar as novas funções
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
  clearCompletedItems,
  saveShoppingList,
  getSavedLists,
  getSavedListDetails,
  deleteSavedList
}; 