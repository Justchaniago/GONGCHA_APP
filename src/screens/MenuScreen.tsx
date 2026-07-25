import React, { useState } from 'react';
import { useMenu } from '../composition/menu';
import { buildMenuViewModel } from '../application/menu/GetMenu';
import MenuView from '../presentation/menu/MenuView';
import type { MenuItemDisplay } from '../application/menu/GetMenu';

export default function MenuScreen() {
  const { items: gongchaMenu, isLoading } = useMenu();

  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<MenuItemDisplay | null>(null);

  const model = buildMenuViewModel(gongchaMenu, selectedCategory);

  const filteredItems = searchQuery
    ? model.items.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : model.items;

  return (
    <MenuView
      categories={model.categories}
      items={filteredItems}
      selectedCategory={selectedCategory}
      onSelectCategory={setSelectedCategory}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      selectedItem={selectedItem}
      onSelectItem={setSelectedItem}
      loading={isLoading}
    />
  );
}
