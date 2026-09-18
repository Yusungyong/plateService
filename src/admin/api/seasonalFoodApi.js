import {apiClient} from '../../api';
import {unwrapAdminResponse} from './adminApiUtils';

export async function getSeasonalFoods(page = 0) {
  return unwrapAdminResponse(await apiClient.get('/api/admin/seasonal-foods', {query: {page, size: 50}}));
}
export async function updateSeasonalFood(id, command) {
  return unwrapAdminResponse(await apiClient.put(`/api/admin/seasonal-foods/${id}`, command));
}
export async function getPublishedSeasonalFoodOptions() {
  const result = [];
  for (let page = 0; ; page++) {
    const response = await getSeasonalFoods(page);
    result.push(...response.content.filter(food => food.status === 'PUBLISHED'));
    if (!response.hasNext) return result;
    if (!response.content.length) throw new Error('식재료 목록을 끝까지 불러오지 못했습니다.');
  }
}
