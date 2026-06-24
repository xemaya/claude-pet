import { SHOP_ITEMS, findItem, itemById } from '../../src/view/shopItems';

test('每个商品有名/价/网格', () => {
  for (const it of SHOP_ITEMS) {
    expect(it.name).toBeTruthy(); expect(it.price).toBeGreaterThan(0); expect(it.grid.length).toBeGreaterThan(0);
  }
});
test('findItem 按中文名/英文id/子串', () => {
  expect(findItem('草帽')?.id).toBe('straw');
  expect(findItem('catears')?.id).toBe('catears');
  expect(findItem('我想买猫耳')?.id).toBe('catears');
  expect(findItem('不存在的')).toBeNull();
});
test('itemById', () => { expect(itemById('santa')?.name).toBe('圣诞帽'); expect(itemById(null)).toBeNull(); });
