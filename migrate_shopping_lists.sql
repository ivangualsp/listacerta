-- Criar tabela para listas de compras
CREATE TABLE IF NOT EXISTS shopping_lists (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_name TEXT NOT NULL,
    purchase_date DATE NOT NULL,
    notes TEXT,
    total_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Criar tabela para itens das listas de compras
CREATE TABLE IF NOT EXISTS shopping_list_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    quantity DECIMAL(10, 2) DEFAULT 1,
    unit TEXT DEFAULT 'Un',
    category TEXT,
    price DECIMAL(10, 2),
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Adicionar políticas RLS para shopping_lists
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver apenas suas próprias listas"
    ON shopping_lists
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas próprias listas"
    ON shopping_lists
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias listas"
    ON shopping_lists
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem excluir suas próprias listas"
    ON shopping_lists
    FOR DELETE
    USING (auth.uid() = user_id);

-- Adicionar políticas RLS para shopping_list_items
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver apenas seus próprios itens"
    ON shopping_list_items
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seus próprios itens"
    ON shopping_list_items
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios itens"
    ON shopping_list_items
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem excluir seus próprios itens"
    ON shopping_list_items
    FOR DELETE
    USING (auth.uid() = user_id);

-- Criar índices para otimizar consultas
CREATE INDEX IF NOT EXISTS shopping_lists_user_id_idx ON shopping_lists(user_id);
CREATE INDEX IF NOT EXISTS shopping_lists_purchase_date_idx ON shopping_lists(purchase_date);
CREATE INDEX IF NOT EXISTS shopping_list_items_list_id_idx ON shopping_list_items(list_id);
CREATE INDEX IF NOT EXISTS shopping_list_items_user_id_idx ON shopping_list_items(user_id); 