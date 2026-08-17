import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { buildMenuViewModel } from '../application/menu/GetMenu';
import { MenuMorphScreen } from '../components/MenuMorphScreen';
import { useMenu } from '../composition/menu';

export default function LocalMenuScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { items: gongchaMenu } = useMenu();

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
