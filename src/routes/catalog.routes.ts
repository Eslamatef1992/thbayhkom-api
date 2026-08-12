import { Router } from 'express';
import { Op } from 'sequelize';
import {
  Product, ProductTranslation, ProductCategory, Favorite, Category, CategoryTranslation, Banner,
} from '../db/models';
import { ok, fail } from '../utils/response';
import { asyncHandler, getPage, paginate } from '../utils/http';
import { authOptional, authRequired, AuthedRequest } from '../middleware/auth';
import { presentProduct, presentCategory, presentBanner } from '../presenters/catalog';
import { pageSize, favoriteIds, productInclude } from './app.routes';

const router = Router();

/** Resolve product ids that belong to a category (via pivot). */
async function productIdsInCategory(categoryId: string | number): Promise<number[]> {
  const rows = await ProductCategory.findAll({ where: { category_id: categoryId } });
  return rows.map((r: any) => r.product_id);
}

/** Resolve product ids whose translated name matches a search term. */
async function productIdsByName(text: string): Promise<number[]> {
  const rows = await ProductTranslation.findAll({ where: { name: { [Op.like]: `%${text}%` } } });
  return [...new Set(rows.map((r: any) => r.product_id))];
}

router.get('/getHomePage', authOptional, asyncHandler(async (req: AuthedRequest, res) => {
  const lang = req.ctx?.lang || 'en';
  const favs = await favoriteIds(req.authUser?.id);
  const categories = await Category.findAll({ where: { status: 'active' }, include: [{ model: CategoryTranslation, as: 'translations' }] });
  const banners = await Banner.findAll({ where: { status: 'active' } });
  const best = await Product.findAll({ where: { is_best_seller: 1, status: 'active' }, include: productInclude, limit: 10 });
  const featured = await Product.findAll({ where: { is_featured: 1, status: 'active' }, include: productInclude, limit: 10 });
  ok(res, {
    categories: categories.map((c) => presentCategory(c, lang)),
    banners: banners.map(presentBanner),
    best_seller_products: best.map((p: any) => presentProduct(p, { isFavorite: favs.has(p.id), lang })),
    featured_products: featured.map((p: any) => presentProduct(p, { isFavorite: favs.has(p.id), lang })),
  });
}));

router.post('/getProducts', authOptional, asyncHandler(async (req: AuthedRequest, res) => {
  const lang = req.ctx?.lang || 'en';
  const page = getPage(req);
  const size = await pageSize();
  const where: any = { status: 'active' };
  const { text, category_id, price_from, price_to, sorting_type, is_best_seller } = req.body;

  // Name (translated) and category (pivot) filters resolve to product id sets.
  const idFilters: number[][] = [];
  if (text) idFilters.push(await productIdsByName(text));
  if (category_id) idFilters.push(await productIdsInCategory(category_id));
  if (idFilters.length) {
    const intersection = idFilters.reduce((acc, ids) => acc.filter((id) => ids.includes(id)));
    where.id = { [Op.in]: intersection.length ? intersection : [0] };
  }

  if (price_from) where.price = { ...(where.price || {}), [Op.gte]: parseFloat(price_from) };
  if (price_to) where.price = { ...(where.price || {}), [Op.lte]: parseFloat(price_to) };
  if (is_best_seller === '1') where.is_best_seller = 1;

  // alpha sorting is by translated name → sort in memory after fetch; price sorts in SQL.
  let order: any = [['id', 'DESC']];
  if (sorting_type === 'price_asc') order = [['price', 'ASC']];
  else if (sorting_type === 'price_desc') order = [['price', 'DESC']];

  const { limit, offset } = paginate(page, size);
  const { count, rows } = await Product.findAndCountAll({ where, order, limit, offset, include: productInclude });
  const favs = await favoriteIds(req.authUser?.id);
  let items = rows.map((p: any) => presentProduct(p, { isFavorite: favs.has(p.id), lang }));
  if (sorting_type === 'alpha_asc') items = items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  else if (sorting_type === 'alpha_desc') items = items.sort((a, b) => (b.name || '').localeCompare(a.name || ''));

  ok(res, { items, is_there_more: offset + rows.length < count });
}));

router.get('/getProductDetails/:id', authOptional, asyncHandler(async (req: AuthedRequest, res) => {
  const lang = req.ctx?.lang || 'en';
  const product = await Product.findByPk(req.params.id, { include: productInclude });
  if (!product) return fail(res, 404, 'Product not found');
  const favs = await favoriteIds(req.authUser?.id);
  ok(res, { items: presentProduct(product, { isFavorite: favs.has((product as any).id), lang }) });
}));

router.get('/addAndRemoveFromFavorite/:id', authRequired, asyncHandler(async (req: AuthedRequest, res) => {
  const productId = parseInt(req.params.id, 10);
  const existing = await Favorite.findOne({ where: { user_id: req.authUser.id, product_id: productId } });
  if (existing) {
    await existing.destroy();
    return ok(res, {}, 'Removed from favorites');
  }
  await Favorite.create({ user_id: req.authUser.id, product_id: productId });
  ok(res, {}, 'Added to favorites');
}));

router.get('/getMyFavorites', authRequired, asyncHandler(async (req: AuthedRequest, res) => {
  const lang = req.ctx?.lang || 'en';
  const page = getPage(req);
  const size = await pageSize();
  const { limit, offset } = paginate(page, size);
  const favs = await Favorite.findAll({ where: { user_id: req.authUser.id } });
  const ids = favs.map((f: any) => f.product_id);
  const { count, rows } = await Product.findAndCountAll({
    where: { id: { [Op.in]: ids.length ? ids : [0] } },
    include: productInclude, limit, offset,
  });
  ok(res, {
    items: rows.map((p: any) => presentProduct(p, { isFavorite: true, lang })),
    is_there_more: offset + rows.length < count,
  });
}));

export default router;

