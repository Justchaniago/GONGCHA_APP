import React, { useState } from 'react';
import { useMenu } from '../composition/menu';
import { buildMenuViewModel } from '../application/menu/GetMenu';
import { MenuMorphScreen } from '../components/MenuMorphScreen';

export default function MenuScreen() {
  const { items: gongchaMenu, isLoading, isRefreshing, refresh } = useMenu();

  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  const model = buildMenuViewModel(gongchaMenu, selectedCategory);

  const filteredItems = searchQuery
    ? model.items.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : model.items;

  const stringCategories = model.categories.map((c) => c.id);

  return (
    <MenuMorphScreen
      categories={stringCategories}
      items={filteredItems}
      selectedCategory={selectedCategory}
      onSelectCategory={setSelectedCategory}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    />
  );
}
