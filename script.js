import { 
    getCurrentUser, 
    getItems, 
    addItem as addItemToSupabase, 
    updateItem as updateItemInSupabase, 
    deleteItem as deleteItemFromSupabase, 
    clearCompletedItems as clearCompletedFromSupabase,
    signOut,
    saveShoppingList,
    getSavedLists,
    getSavedListDetails,
    deleteSavedList
} from './supabase.js';

document.addEventListener('DOMContentLoaded', async function() {
    // Verificar se o usuário está autenticado
    const { data, error: userError } = await getCurrentUser();
    
    // Armazenar o usuário para uso em todo o script
    const user = data?.user;
    
    if (!user) {
        // Redirecionar para a página de login se não estiver autenticado
        console.error('Usuário não autenticado ou ocorreu um erro:', userError);
        window.location.href = 'auth.html';
        return;
    }
    
    // Log para debug
    console.log('Usuário autenticado:', user.id);
    
    // Elementos do DOM
    const itemInput = document.getElementById('item-input');
    const quantityInput = document.getElementById('quantity-input');
    const unitSelect = document.getElementById('unit-select');
    const priceInput = document.getElementById('price-input');
    const categorySelect = document.getElementById('category-select');
    const addButton = document.getElementById('add-button');
    const shoppingList = document.getElementById('shopping-list');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const clearCompletedBtn = document.getElementById('clear-completed');
    const totalItemsSpan = document.getElementById('total-items');
    const completedItemsSpan = document.getElementById('completed-items');
    const totalPriceSpan = document.getElementById('total-price');
    const themeToggle = document.querySelector('.theme-toggle');
    
    // Elementos do modal de edição
    const editModal = document.getElementById('edit-modal');
    const closeModal = document.querySelector('.close-modal');
    const editItemInput = document.getElementById('edit-item-input');
    const editQuantityInput = document.getElementById('edit-quantity-input');
    const editUnitSelect = document.getElementById('edit-unit-select');
    const editPriceInput = document.getElementById('edit-price-input');
    const editCategorySelect = document.getElementById('edit-category-select');
    const saveEditButton = document.getElementById('save-edit-button');
    
    // Variável para armazenar o ID do item em edição
    let editingItemId = null;
    
    // Estado da aplicação
    let items = [];
    let currentFilter = 'all';
    
    // Inicialização
    loadItems();
    updateCounters();
    
    // Verificar tema salvo
    if (localStorage.getItem('darkTheme') === 'true') {
        document.body.classList.add('dark-theme');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    // Event Listeners
    addButton.addEventListener('click', function(e) {
        console.log("Botão adicionar clicado"); // Para debug
        addItem();
    });
    itemInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addItem();
        }
    });
    
    clearCompletedBtn.addEventListener('click', clearCompleted);
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.getAttribute('data-filter');
            renderItems();
        });
    });
    
    themeToggle.addEventListener('click', toggleTheme);
    
    // Botão de logout
    const signOutButton = document.createElement('button');
    signOutButton.textContent = 'Sair';
    signOutButton.classList.add('sign-out-btn');
    document.querySelector('header').appendChild(signOutButton);
    
    // Event listeners para o modal
    closeModal.addEventListener('click', closeEditModal);
    window.addEventListener('click', function(event) {
        if (event.target === editModal) {
            closeEditModal();
        }
    });
    
    saveEditButton.addEventListener('click', saveEditedItem);
    
    // Elementos para salvar listas
    const saveListBtn = document.getElementById('save-list-btn');
    const saveListModal = document.getElementById('save-list-modal');
    const closeSaveModal = document.getElementById('close-save-modal');
    const storeNameInput = document.getElementById('store-name');
    const listDateInput = document.getElementById('list-date');
    const listNotesInput = document.getElementById('list-notes');
    const saveTotalItems = document.getElementById('save-total-items');
    const saveTotalValue = document.getElementById('save-total-value');
    const confirmSaveList = document.getElementById('confirm-save-list');
    
    // Elementos para visualizar listas salvas
    const viewSavedListsBtn = document.getElementById('view-saved-lists-btn');
    const savedListsModal = document.getElementById('saved-lists-modal');
    const closeSavedListsModal = document.getElementById('close-saved-lists-modal');
    const savedListsContainer = document.getElementById('saved-lists');
    const searchListsInput = document.getElementById('search-lists');
    const sortListsSelect = document.getElementById('sort-lists');
    
    // Inicializar data atual no formulário de salvar lista
    const today = new Date().toISOString().split('T')[0];
    listDateInput.value = today;
    
    // Event Listeners para salvar e gerenciar listas
    saveListBtn.addEventListener('click', openSaveListModal);
    closeSaveModal.addEventListener('click', () => {
        saveListModal.style.display = 'none';
    });
    confirmSaveList.addEventListener('click', saveCurrentList);
    
    viewSavedListsBtn.addEventListener('click', openSavedListsModal);
    closeSavedListsModal.addEventListener('click', () => {
        savedListsModal.style.display = 'none';
    });
    
    searchListsInput.addEventListener('input', filterSavedLists);
    sortListsSelect.addEventListener('change', sortSavedLists);
    
    // Fechar modais clicando fora
    window.addEventListener('click', function(event) {
        if (event.target === saveListModal) {
            saveListModal.style.display = 'none';
        }
        if (event.target === savedListsModal) {
            savedListsModal.style.display = 'none';
        }
    });
    
    // Funções
    async function loadItems() {
        try {
            const { data, error } = await getItems();
            
            if (error) {
                console.error('Erro ao carregar itens:', error);
                return;
            }
            
            items = data || [];
            renderItems();
            updateCounters();
        } catch (err) {
            console.error('Erro ao carregar itens:', err);
        }
    }
    
    async function addItem() {
        try {
            console.log("Função addItem() chamada"); // Para debug
            
            const text = itemInput.value.trim();
            if (text) {
                // Obter e validar os valores
                let quantity = parseFloat(quantityInput.value) || 1;
                quantity = Math.max(0.1, quantity); // Garantir que a quantidade seja pelo menos 0.1
                
                let price = parseFloat(priceInput.value) || 0;
                price = Math.max(0, price); // Garantir que o preço não seja negativo
                
                // Verificar se user está definido
                if (!user || !user.id) {
                    console.error('Usuário não autenticado ou ID não disponível');
                    return;
                }
                
                const newItem = {
                    text: text,
                    quantity: quantity,
                    unit: unitSelect.value,
                    category: categorySelect.value,
                    price: price,
                    completed: false,
                    created_at: new Date().toISOString(),
                    user_id: user.id // Adicionando explicitamente o user_id
                };
                
                console.log("Novo item criado:", newItem); // Para debug
                
                // Adicionar ao Supabase
                const { data, error } = await addItemToSupabase(newItem);
                
                if (error) {
                    console.error('Erro ao adicionar item:', error);
                    return;
                }
                
                if (data && data.length > 0) {
                    items.push(data[0]);
                    renderItems();
                    updateCounters();
                }
                
                // Limpar campos
                itemInput.value = '';
                quantityInput.value = '1'; // Resetar para o valor padrão
                priceInput.value = '';
                itemInput.focus();
            } else {
                console.log("Texto do item está vazio"); // Para debug
            }
        } catch (error) {
            console.error("Erro ao adicionar item:", error); // Capturar qualquer erro
        }
    }
    
    async function toggleItemStatus(id) {
        const item = items.find(item => item.id === id);
        if (!item) return;
        
        const updates = { completed: !item.completed };
        
        try {
            const { data, error } = await updateItemInSupabase(id, updates);
            
            if (error) {
                console.error('Erro ao atualizar item:', error);
                return;
            }
            
            // Atualizar os itens locais
            items = items.map(item => {
                if (item.id === id) {
                    return { ...item, completed: !item.completed };
                }
                return item;
            });
            
            renderItems();
            updateCounters();
        } catch (err) {
            console.error('Erro ao atualizar item:', err);
        }
    }
    
    async function deleteItem(id) {
        try {
            const { error } = await deleteItemFromSupabase(id);
            
            if (error) {
                console.error('Erro ao excluir item:', error);
                return;
            }
            
            // Remover o item localmente
            items = items.filter(item => item.id !== id);
            renderItems();
            updateCounters();
        } catch (err) {
            console.error('Erro ao excluir item:', err);
        }
    }
    
    async function clearCompleted() {
        try {
            const { error } = await clearCompletedFromSupabase();
            
            if (error) {
                console.error('Erro ao limpar itens completos:', error);
                return;
            }
            
            // Remover itens completos localmente
            items = items.filter(item => !item.completed);
            renderItems();
            updateCounters();
        } catch (err) {
            console.error('Erro ao limpar itens completos:', err);
        }
    }
    
    function openEditModal(id) {
        // Encontrar o item pelo ID
        const item = items.find(item => item.id === id);
        if (!item) return;
        
        // Preencher o formulário com os dados do item
        editItemInput.value = item.text;
        editQuantityInput.value = item.quantity || 1;
        editUnitSelect.value = item.unit || 'Un';
        editPriceInput.value = item.price || '';
        editCategorySelect.value = item.category;
        
        // Armazenar o ID do item em edição
        editingItemId = id;
        
        // Exibir o modal
        editModal.style.display = 'block';
    }
    
    function closeEditModal() {
        editModal.style.display = 'none';
        editingItemId = null;
    }
    
    async function saveEditedItem() {
        if (editingItemId === null) return;
        
        // Validar os valores
        const text = editItemInput.value.trim();
        if (!text) {
            alert('Por favor, informe o nome do item');
            return;
        }
        
        let quantity = parseFloat(editQuantityInput.value) || 1;
        quantity = Math.max(0.1, quantity);
        
        let price = parseFloat(editPriceInput.value) || 0;
        price = Math.max(0, price);
        
        // Mostrar feedback visual
        const originalButtonText = saveEditButton.textContent;
        saveEditButton.textContent = 'Salvando...';
        saveEditButton.disabled = true;
        
        const updates = {
            text: text,
            quantity: quantity,
            unit: editUnitSelect.value,
            price: price,
            category: editCategorySelect.value,
            user_id: user.id // Importante: garantir que o user_id esteja incluído
        };
        
        console.log('Enviando atualização para item:', editingItemId, updates);
        
        try {
            const { data, error } = await updateItemInSupabase(editingItemId, updates);
            
            // Restaurar o botão
            saveEditButton.textContent = originalButtonText;
            saveEditButton.disabled = false;
            
            if (error) {
                console.error('Erro ao atualizar item:', error);
                alert('Erro ao atualizar item: ' + (error.message || 'Tente novamente mais tarde'));
                return;
            }
            
            console.log('Dados retornados após atualização:', data);
            
            if (!data || data.length === 0) {
                console.error('Nenhum dado retornado após atualização');
                alert('Erro ao atualizar item: Nenhum dado retornado');
                return;
            }
            
            // Atualizar o item localmente
            items = items.map(item => {
                if (item.id === editingItemId) {
                    return { ...item, ...updates };
                }
                return item;
            });
            
            renderItems();
            updateCounters();
            closeEditModal();
            
            // Feedback opcional
            const feedbackMessage = document.createElement('div');
            feedbackMessage.className = 'success-message';
            feedbackMessage.textContent = 'Item atualizado com sucesso!';
            document.body.appendChild(feedbackMessage);
            
            setTimeout(() => {
                document.body.removeChild(feedbackMessage);
            }, 2000);
            
        } catch (err) {
            console.error('Exceção ao atualizar item:', err);
            alert('Erro inesperado ao atualizar item');
            
            // Restaurar o botão em caso de erro
            saveEditButton.textContent = originalButtonText;
            saveEditButton.disabled = false;
        }
    }
    
    function renderItems() {
        shoppingList.innerHTML = '';
        
        let filteredItems = items;
        if (currentFilter === 'pending') {
            filteredItems = items.filter(item => !item.completed);
        } else if (currentFilter === 'completed') {
            filteredItems = items.filter(item => item.completed);
        }
        
        if (filteredItems.length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.textContent = 'Nenhum item na lista';
            emptyMessage.style.textAlign = 'center';
            emptyMessage.style.color = 'var(--secondary-color)';
            emptyMessage.style.padding = '1rem';
            shoppingList.appendChild(emptyMessage);
            return;
        }
        
        filteredItems.forEach(item => {
            const listItem = document.createElement('div');
            listItem.className = `list-item ${item.completed ? 'completed' : ''}`;
            
            // Calcular o valor total (preço x quantidade)
            const totalItemPrice = (item.price !== undefined && item.price !== null && item.quantity !== undefined && item.quantity !== null) 
                ? item.price * item.quantity 
                : 0;
            
            // Formatar o preço unitário para exibição
            const formattedUnitPrice = (item.price !== undefined && item.price !== null) 
                ? item.price.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })
                : '0,00';
            
            // Formatar o preço total para exibição
            const formattedTotalPrice = totalItemPrice.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            
            // Adicionar o ícone correspondente à categoria
            let categoryIcon = '';
            switch(item.category) {
                case 'frutas':
                    categoryIcon = '<i class="fas fa-apple-alt"></i>';
                    break;
                case 'laticínios':
                    categoryIcon = '<i class="fas fa-cheese"></i>';
                    break;
                case 'padaria':
                    categoryIcon = '<i class="fas fa-bread-slice"></i>';
                    break;
                case 'carnes':
                    categoryIcon = '<i class="fas fa-drumstick-bite"></i>';
                    break;
                case 'congelados':
                    categoryIcon = '<i class="fas fa-snowflake"></i>';
                    break;
                case 'bebidas':
                    categoryIcon = '<i class="fas fa-wine-bottle"></i>';
                    break;
                case 'limpeza':
                    categoryIcon = '<i class="fas fa-broom"></i>';
                    break;
                case 'higiene':
                    categoryIcon = '<i class="fas fa-soap"></i>';
                    break;
                default:
                    categoryIcon = '<i class="fas fa-shopping-basket"></i>';
            }
            
            listItem.innerHTML = `
                <div class="item-left">
                    <div class="checkbox-container">
                        <input type="checkbox" id="item-${item.id}" ${item.completed ? 'checked' : ''}>
                        <label for="item-${item.id}"></label>
                    </div>
                    <div class="item-details">
                        <div class="item-text">
                            <span class="category-icon">${categoryIcon}</span>
                            <span>${item.text}</span>
                        </div>
                        <div class="item-info">
                            <span class="item-quantity">${item.quantity} ${item.unit}</span>
                            <span class="item-price">R$ ${formattedUnitPrice}</span>
                        </div>
                    </div>
                </div>
                <div class="item-right">
                    <span class="item-total-price">R$ ${formattedTotalPrice}</span>
                    <div class="item-actions">
                        <button class="edit-btn"><i class="fas fa-edit"></i></button>
                        <button class="delete-btn"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
            
            // Adicionar event listeners
            const checkbox = listItem.querySelector(`#item-${item.id}`);
            checkbox.addEventListener('change', function() {
                toggleItemStatus(item.id);
            });
            
            const editBtn = listItem.querySelector('.edit-btn');
            editBtn.addEventListener('click', function() {
                openEditModal(item.id);
            });
            
            const deleteBtn = listItem.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', function() {
                if (confirm('Tem certeza que deseja excluir este item?')) {
                    deleteItem(item.id);
                }
            });
            
            shoppingList.appendChild(listItem);
        });
    }
    
    function updateCounters() {
        const totalItems = items.length;
        const completedItems = items.filter(item => item.completed).length;
        
        // Calcular o valor total de todos os itens
        const totalPrice = items.reduce((total, item) => {
            if (item.price && item.quantity) {
                return total + (item.price * item.quantity);
            }
            return total;
        }, 0);
        
        // Atualizar os contadores
        totalItemsSpan.textContent = totalItems;
        completedItemsSpan.textContent = completedItems;
        totalPriceSpan.textContent = totalPrice.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
    
    function toggleTheme() {
        document.body.classList.toggle('dark-theme');
        
        if (document.body.classList.contains('dark-theme')) {
            localStorage.setItem('darkTheme', 'true');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            localStorage.setItem('darkTheme', 'false');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
    }
    
    // Botão de logout
    signOutButton.addEventListener('click', async () => {
        const { error } = await signOut();
        if (!error) {
            window.location.href = 'auth.html';
        }
    });
    
    // Funções para salvar e gerenciar listas
    function openSaveListModal() {
        if (items.length === 0) {
            alert('Adicione itens à lista antes de salvar.');
            return;
        }
        
        // Preencher o resumo da lista
        saveTotalItems.textContent = items.length;
        
        const totalPrice = items.reduce((total, item) => {
            return total + (item.price || 0) * (item.quantity || 0);
        }, 0);
        
        saveTotalValue.textContent = totalPrice.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        
        // Exibir o modal
        saveListModal.style.display = 'block';
    }
    
    async function saveCurrentList() {
        const storeName = storeNameInput.value.trim();
        const purchaseDate = listDateInput.value;
        const notes = listNotesInput.value.trim();
        
        if (!storeName) {
            alert('Por favor, informe o nome do estabelecimento.');
            return;
        }
        
        if (!purchaseDate) {
            alert('Por favor, informe a data da compra.');
            return;
        }
        
        const totalPrice = items.reduce((total, item) => {
            return total + (item.price || 0) * (item.quantity || 0);
        }, 0);
        
        try {
            // Mostrar um feedback visual de que está salvando
            const originalButtonText = confirmSaveList.textContent;
            confirmSaveList.textContent = 'Salvando...';
            confirmSaveList.disabled = true;
            
            const shoppingListData = {
                store_name: storeName,
                purchase_date: purchaseDate,
                notes: notes,
                total_price: totalPrice,
                items: items.map(item => ({
                    text: item.text,
                    quantity: item.quantity,
                    unit: item.unit,
                    category: item.category,
                    price: item.price,
                    completed: item.completed
                }))
            };
            
            const { data, error } = await saveShoppingList(shoppingListData);
            
            // Restaurar o botão
            confirmSaveList.textContent = originalButtonText;
            confirmSaveList.disabled = false;
            
            if (error) {
                console.error('Erro ao salvar lista:', error);
                
                // Mensagem mais informativa baseada no erro
                let errorMessage = 'Erro ao salvar a lista';
                
                if (error.message) {
                    errorMessage += ': ' + error.message;
                } else if (error.code === '42P01') {
                    errorMessage += ': As tabelas necessárias não existem no banco de dados. Execute a migração SQL primeiro.';
                } else if (error.code === '23505') {
                    errorMessage += ': Já existe uma lista com essas informações.';
                } else if (error.code === '42501') {
                    errorMessage += ': Você não tem permissão para realizar esta operação.';
                } else {
                    errorMessage += '. Tente novamente mais tarde.';
                }
                
                alert(errorMessage);
                return;
            }
            
            alert('Lista salva com sucesso!');
            saveListModal.style.display = 'none';
            
            // Limpar os campos
            storeNameInput.value = '';
            listNotesInput.value = '';
            
            // Opcionalmente, recarregar as listas salvas se o modal estiver aberto
            if (savedListsModal.style.display === 'block') {
                openSavedListsModal();
            }
        } catch (err) {
            console.error('Exceção ao salvar lista:', err);
            alert('Erro inesperado ao salvar a lista. Por favor, tente novamente.');
            
            // Restaurar o botão em caso de erro
            confirmSaveList.textContent = originalButtonText;
            confirmSaveList.disabled = false;
        }
    }
    
    async function openSavedListsModal() {
        savedListsContainer.innerHTML = '<p>Carregando listas salvas...</p>';
        savedListsModal.style.display = 'block';
        
        try {
            const { data, error } = await getSavedLists();
            
            if (error) {
                console.error('Erro ao carregar listas salvas:', error);
                savedListsContainer.innerHTML = '<p>Erro ao carregar listas. Tente novamente mais tarde.</p>';
                return;
            }
            
            if (!data || data.length === 0) {
                savedListsContainer.innerHTML = '<p>Nenhuma lista salva encontrada.</p>';
                return;
            }
            
            renderSavedLists(data);
        } catch (err) {
            console.error('Erro ao carregar listas salvas:', err);
            savedListsContainer.innerHTML = '<p>Erro ao carregar listas. Tente novamente mais tarde.</p>';
        }
    }
    
    function renderSavedLists(lists) {
        savedListsContainer.innerHTML = '';
        
        lists.forEach(list => {
            const listElement = document.createElement('div');
            listElement.className = 'saved-list-item';
            
            // Formatar data adequadamente para evitar problemas com timezone
            let formattedDate;
            try {
                // Pegar a data como string YYYY-MM-DD do banco
                const dateStr = list.purchase_date;
                
                // Dividir a data para obter ano, mês e dia
                const [year, month, day] = dateStr.split('-');
                
                // Formatar no padrão brasileiro
                formattedDate = `${day}/${month}/${year}`;
            } catch (e) {
                console.error('Erro ao formatar data:', e);
                formattedDate = 'Data indisponível';
            }
            
            // Formatar preço
            const formattedPrice = list.total_price.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            });
            
            listElement.innerHTML = `
                <div class="saved-list-header">
                    <div class="saved-list-title">${list.store_name}</div>
                    <div class="saved-list-date">${formattedDate}</div>
                </div>
                <div class="saved-list-summary">
                    <div>Total: ${formattedPrice}</div>
                    <button class="toggle-details-btn" data-id="${list.id}">Ver Detalhes</button>
                </div>
                ${list.notes ? `<div class="saved-list-notes">${list.notes}</div>` : ''}
                <div class="saved-list-details" id="details-${list.id}">
                    <div class="saved-list-items-loading">Carregando itens...</div>
                </div>
                <div class="saved-list-actions">
                    <button class="load-list-btn" data-id="${list.id}">Carregar Lista</button>
                    <button class="compare-list-btn" data-id="${list.id}">Comparar</button>
                    <button class="delete-list-btn" data-id="${list.id}">Excluir</button>
                </div>
            `;
            
            savedListsContainer.appendChild(listElement);
            
            // Adicionar event listeners aos botões
            const toggleDetailsBtn = listElement.querySelector(`.toggle-details-btn[data-id="${list.id}"]`);
            toggleDetailsBtn.addEventListener('click', () => toggleListDetails(list.id));
            
            const loadListBtn = listElement.querySelector(`.load-list-btn[data-id="${list.id}"]`);
            loadListBtn.addEventListener('click', () => loadSavedList(list.id));
            
            const compareListBtn = listElement.querySelector(`.compare-list-btn[data-id="${list.id}"]`);
            compareListBtn.addEventListener('click', () => compareWithCurrentList(list.id));
            
            const deleteListBtn = listElement.querySelector(`.delete-list-btn[data-id="${list.id}"]`);
            deleteListBtn.addEventListener('click', () => confirmDeleteList(list.id, list.store_name));
        });
    }
    
    async function toggleListDetails(listId) {
        const detailsContainer = document.getElementById(`details-${listId}`);
        
        if (detailsContainer.classList.contains('expanded')) {
            detailsContainer.classList.remove('expanded');
            return;
        }
        
        detailsContainer.classList.add('expanded');
        
        // Carregar detalhes da lista se ainda não foram carregados
        if (detailsContainer.querySelector('.saved-list-items-loading')) {
            try {
                const { data, error } = await getSavedListDetails(listId);
                
                if (error) {
                    console.error('Erro ao carregar detalhes da lista:', error);
                    detailsContainer.innerHTML = '<p>Erro ao carregar detalhes. Tente novamente.</p>';
                    return;
                }
                
                renderListDetails(detailsContainer, data.items);
            } catch (err) {
                console.error('Erro ao carregar detalhes da lista:', err);
                detailsContainer.innerHTML = '<p>Erro ao carregar detalhes. Tente novamente.</p>';
            }
        }
    }
    
    function renderListDetails(container, items) {
        if (!items || items.length === 0) {
            container.innerHTML = '<p>Nenhum item encontrado nesta lista.</p>';
            return;
        }
        
        const itemsList = document.createElement('ul');
        itemsList.className = 'saved-list-items';
        
        items.forEach(item => {
            const listItem = document.createElement('li');
            
            // Calcular o valor total do item
            const itemTotal = (item.price || 0) * (item.quantity || 0);
            const formattedPrice = item.price ? `R$ ${item.price.toFixed(2)}` : 'Sem preço';
            const formattedTotal = `R$ ${itemTotal.toFixed(2)}`;
            
            listItem.innerHTML = `
                <div class="saved-item-name">${item.text}</div>
                <div class="saved-item-details">
                    <span>${item.quantity || 1} ${item.unit || 'Un'}</span>
                    <span>${formattedPrice}</span>
                    <span class="saved-item-total">${formattedTotal}</span>
                </div>
            `;
            
            itemsList.appendChild(listItem);
        });
        
        container.innerHTML = '';
        container.appendChild(itemsList);
    }
    
    async function loadSavedList(listId) {
        if (items.length > 0) {
            const confirmLoad = confirm('Isso substituirá sua lista atual. Deseja continuar?');
            if (!confirmLoad) return;
        }
        
        try {
            const { data, error } = await getSavedListDetails(listId);
            
            if (error) {
                console.error('Erro ao carregar lista:', error);
                alert('Erro ao carregar a lista. Tente novamente mais tarde.');
                return;
            }
            
            // Substituir a lista atual com os itens da lista salva
            items = data.items.map(item => ({
                id: null, // Serão novos itens
                text: item.text,
                quantity: item.quantity,
                unit: item.unit,
                category: item.category,
                price: item.price,
                completed: false, // Sempre iniciar como não completados
                user_id: user.id
            }));
            
            renderItems();
            updateCounters();
            savedListsModal.style.display = 'none';
            
            alert(`Lista "${data.store_name}" carregada com sucesso!`);
        } catch (err) {
            console.error('Erro ao carregar lista:', err);
            alert('Erro ao carregar a lista. Tente novamente mais tarde.');
        }
    }
    
    async function compareWithCurrentList(listId) {
        if (items.length === 0) {
            alert('Sua lista atual está vazia. Adicione itens para comparar.');
            return;
        }
        
        try {
            const { data, error } = await getSavedListDetails(listId);
            
            if (error) {
                console.error('Erro ao carregar detalhes para comparação:', error);
                alert('Erro ao carregar dados para comparação. Tente novamente mais tarde.');
                return;
            }
            
            // Criar modal de comparação
            createComparisonModal(data);
        } catch (err) {
            console.error('Erro ao comparar listas:', err);
            alert('Erro ao comparar listas. Tente novamente mais tarde.');
        }
    }
    
    function createComparisonModal(savedList) {
        // Criar elementos do modal
        const comparisonModal = document.createElement('div');
        comparisonModal.className = 'modal';
        comparisonModal.id = 'comparison-modal';
        
        // Formatar a data usando o mesmo método corrigido
        let formattedDate;
        try {
            // Pegar a data como string YYYY-MM-DD do banco
            const dateStr = savedList.purchase_date;
            
            // Dividir a data para obter ano, mês e dia
            const [year, month, day] = dateStr.split('-');
            
            // Formatar no padrão brasileiro
            formattedDate = `${day}/${month}/${year}`;
        } catch (e) {
            console.error('Erro ao formatar data:', e);
            formattedDate = 'Data indisponível';
        }
        
        comparisonModal.innerHTML = `
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h2>Comparação de Listas</h2>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="comparison-container">
                        <div class="comparison-list">
                            <div class="comparison-header">Lista Atual</div>
                            <div id="current-list-comparison"></div>
                        </div>
                        <div class="comparison-list">
                            <div class="comparison-header">${savedList.store_name} (${formattedDate})</div>
                            <div id="saved-list-comparison"></div>
                        </div>
                    </div>
                    <div class="comparison-summary">
                        <h3>Resumo da Comparação</h3>
                        <div id="comparison-results"></div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(comparisonModal);
        
        // Adicionar event listeners
        const closeBtn = comparisonModal.querySelector('.close-modal');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(comparisonModal);
        });
        
        window.addEventListener('click', function(event) {
            if (event.target === comparisonModal) {
                document.body.removeChild(comparisonModal);
            }
        });
        
        // Renderizar a comparação
        renderComparisonLists(savedList);
        
        // Exibir o modal
        comparisonModal.style.display = 'block';
    }
    
    function renderComparisonLists(savedList) {
        const currentListContainer = document.getElementById('current-list-comparison');
        const savedListContainer = document.getElementById('saved-list-comparison');
        const resultsContainer = document.getElementById('comparison-results');
        
        // Mapear itens por nome para facilitar a comparação
        const currentItemsMap = new Map();
        items.forEach(item => {
            currentItemsMap.set(item.text.toLowerCase(), item);
        });
        
        const savedItemsMap = new Map();
        savedList.items.forEach(item => {
            savedItemsMap.set(item.text.toLowerCase(), item);
        });
        
        // Variáveis para o resumo
        let totalSavings = 0;
        let cheaperItems = 0;
        let sameItems = 0;
        let expensiveItems = 0;
        let newItems = 0;
        let missingItems = 0;
        
        // Renderizar a lista atual
        currentListContainer.innerHTML = renderComparisonItemsList(items, savedItemsMap);
        
        // Renderizar a lista salva
        savedListContainer.innerHTML = renderComparisonItemsList(savedList.items, currentItemsMap, true);
        
        // Analisar diferenças para o resumo
        items.forEach(currentItem => {
            const savedItem = savedItemsMap.get(currentItem.text.toLowerCase());
            
            if (savedItem) {
                const currentTotal = (currentItem.price || 0) * (currentItem.quantity || 0);
                const savedTotal = (savedItem.price || 0) * (savedItem.quantity || 0);
                
                if (currentItem.price && savedItem.price) {
                    if (currentItem.price < savedItem.price) {
                        cheaperItems++;
                        totalSavings += (savedTotal - currentTotal);
                    } else if (currentItem.price > savedItem.price) {
                        expensiveItems++;
                        totalSavings -= (currentTotal - savedTotal);
                    } else {
                        sameItems++;
                    }
                }
            } else {
                newItems++;
            }
        });
        
        // Verificar itens que existiam na lista salva mas não na lista atual
        savedList.items.forEach(savedItem => {
            if (!currentItemsMap.has(savedItem.text.toLowerCase())) {
                missingItems++;
            }
        });
        
        // Renderizar o resumo
        const formattedSavings = Math.abs(totalSavings).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
        
        const savingsText = totalSavings > 0 
            ? `Você está economizando ${formattedSavings}` 
            : `Você está gastando ${formattedSavings} a mais`;
        
        resultsContainer.innerHTML = `
            <div class="comparison-stats">
                <div class="comparison-stat">
                    <span class="stat-value">${savingsText}</span>
                    <span class="stat-label">comparado à lista salva</span>
                </div>
                <div class="comparison-details">
                    <p>${cheaperItems} itens mais baratos na lista atual</p>
                    <p>${expensiveItems} itens mais caros na lista atual</p>
                    <p>${sameItems} itens com o mesmo preço</p>
                    <p>${newItems} itens novos (não existiam na lista salva)</p>
                    <p>${missingItems} itens da lista salva não estão na lista atual</p>
                </div>
            </div>
        `;
    }
    
    function renderComparisonItemsList(itemsList, compareMap, isSavedList = false) {
        if (!itemsList || itemsList.length === 0) {
            return '<p>Nenhum item nesta lista.</p>';
        }
        
        let html = '<ul class="comparison-items">';
        
        itemsList.forEach(item => {
            const compareItem = compareMap.get(item.text.toLowerCase());
            
            let statusClass = '';
            let statusText = '';
            
            if (compareItem) {
                if (item.price && compareItem.price) {
                    if (item.price < compareItem.price) {
                        statusClass = 'price-lower';
                        statusText = 'Mais barato';
                    } else if (item.price > compareItem.price) {
                        statusClass = 'price-higher';
                        statusText = 'Mais caro';
                    } else {
                        statusClass = 'price-equal';
                        statusText = 'Mesmo preço';
                    }
                }
            } else {
                statusClass = 'item-unique';
                statusText = 'Único nesta lista';
            }
            
            const formattedPrice = (item.price || 0).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            });
            
            html += `
                <li class="comparison-item ${statusClass}">
                    <div class="comparison-item-name">${item.text}</div>
                    <div class="comparison-item-details">
                        <span>${item.quantity || 1} ${item.unit || 'Un'}</span>
                        <span>${formattedPrice}</span>
                        <span class="comparison-status">${statusText}</span>
                    </div>
                </li>
            `;
        });
        
        html += '</ul>';
        return html;
    }
    
    async function confirmDeleteList(listId, storeName) {
        const confirmDelete = confirm(`Tem certeza que deseja excluir a lista "${storeName}"? Esta ação não pode ser desfeita.`);
        
        if (!confirmDelete) return;
        
        try {
            const { error } = await deleteSavedList(listId);
            
            if (error) {
                console.error('Erro ao excluir lista:', error);
                alert('Erro ao excluir a lista. Tente novamente mais tarde.');
                return;
            }
            
            // Remover o elemento da lista no DOM
            const listElement = document.querySelector(`.saved-list-item .delete-list-btn[data-id="${listId}"]`).closest('.saved-list-item');
            listElement.remove();
            
            // Verificar se há mais listas
            if (savedListsContainer.children.length === 0) {
                savedListsContainer.innerHTML = '<p>Nenhuma lista salva encontrada.</p>';
            }
            
            alert('Lista excluída com sucesso!');
        } catch (err) {
            console.error('Erro ao excluir lista:', err);
            alert('Erro ao excluir a lista. Tente novamente mais tarde.');
        }
    }
    
    function filterSavedLists() {
        const searchTerm = searchListsInput.value.toLowerCase().trim();
        const listItems = savedListsContainer.querySelectorAll('.saved-list-item');
        
        listItems.forEach(item => {
            const storeName = item.querySelector('.saved-list-title').textContent.toLowerCase();
            const notes = item.querySelector('.saved-list-notes')?.textContent.toLowerCase() || '';
            
            if (storeName.includes(searchTerm) || notes.includes(searchTerm)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }
    
    function sortSavedLists() {
        const sortValue = sortListsSelect.value;
        const listItems = Array.from(savedListsContainer.querySelectorAll('.saved-list-item'));
        
        if (listItems.length === 0) return;
        
        listItems.sort((a, b) => {
            // Converter formato DD/MM/YYYY para YYYY-MM-DD para comparação
            const dateTextA = a.querySelector('.saved-list-date').textContent;
            const dateTextB = b.querySelector('.saved-list-date').textContent;
            
            // Converter do formato brasileiro (DD/MM/YYYY) para um formato que pode ser comparado
            const datePartsA = dateTextA.split('/');
            const datePartsB = dateTextB.split('/');
            
            // Criar data no formato YYYY-MM-DD
            const dateStrA = datePartsA.length === 3 ? `${datePartsA[2]}-${datePartsA[1]}-${datePartsA[0]}` : '1970-01-01';
            const dateStrB = datePartsB.length === 3 ? `${datePartsB[2]}-${datePartsB[1]}-${datePartsB[0]}` : '1970-01-01';
            
            const dateA = new Date(dateStrA);
            const dateB = new Date(dateStrB);
            
            const priceA = parseFloat(a.querySelector('.saved-list-summary div').textContent
                .replace('Total: R$', '')
                .replace('.', '')
                .replace(',', '.'));
            const priceB = parseFloat(b.querySelector('.saved-list-summary div').textContent
                .replace('Total: R$', '')
                .replace('.', '')
                .replace(',', '.'));
            
            switch (sortValue) {
                case 'date-desc':
                    return dateB - dateA;
                case 'date-asc':
                    return dateA - dateB;
                case 'price-desc':
                    return priceB - priceA;
                case 'price-asc':
                    return priceA - priceB;
                default:
                    return 0;
            }
        });
        
        // Remover e adicionar de volta na nova ordem
        listItems.forEach(item => {
            savedListsContainer.appendChild(item);
        });
    }
});