import { 
    getCurrentUser, 
    getItems, 
    addItem as addItemToSupabase, 
    updateItem as updateItemInSupabase, 
    deleteItem as deleteItemFromSupabase, 
    clearCompletedItems as clearCompletedFromSupabase,
    signOut
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
        if (!text) return;
        
        let quantity = parseFloat(editQuantityInput.value) || 1;
        quantity = Math.max(0.1, quantity);
        
        let price = parseFloat(editPriceInput.value) || 0;
        price = Math.max(0, price);
        
        const updates = {
            text: text,
            quantity: quantity,
            unit: editUnitSelect.value,
            price: price,
            category: editCategorySelect.value
        };
        
        try {
            const { data, error } = await updateItemInSupabase(editingItemId, updates);
            
            if (error) {
                console.error('Erro ao atualizar item:', error);
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
        } catch (err) {
            console.error('Erro ao atualizar item:', err);
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
});