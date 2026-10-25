import { Router } from 'express';
import { Op } from 'sequelize';
import { Product, Favorite, Category, Banner } from '../db/models';
import { ok, fail } from '../utils/response';
import { asyncHandler, getPage, paginate } from '../utils/http';
import { authOptional, authRequired, AuthedRequest } from '../middleware/auth';
import { presentProduct, presentCategory, presentBanner } from '../presenters/catalog';
import { pageSize, favoriteIds, productInclude } from './app.routes';

const router = Router();

router.get('/getHomePage', authOptional, asyncHandler(async (req: AuthedRequest, res) => {
  const favs = await favoriteIds(req.authUser?.id);
  const categories = await Category.findAll({ where: { status: 'active' } });
  const banners = await Banner.findAll({ where: { status: 'active' } });
  const best = await Product.findAll({ where: { is_best_seller: 1, status: 'active' }, include: productInclude, limit: 10 });
  const featured = await Product.findAll({ where: { is_featured: 1, status: 'active' }, include: productInclude, limit: 10 });
  ok(res, {
    categories: categories.map(presentCategory),
    banners: banners.map(presentBanner),
    best_seller_products: best.map((p: any) => presentProduct(p, { isFavorite: favs.has(p.id) })),
    featured_products: featured.map((p: any) => presentProduct(p, { isFavorite: favs.has(p.id) })),
  });
}));

router.post('/getProducts', authOptional, asyncHandler(async (req: AuthedRequest, res) => {
  const page = getPage(req);
  const size = await pageSize();
  const where: any = { status: 'active' };
  const { text, category_id, price_from, price_to, sorting_type, is_best_seller } = req.body;
  if (text) where.name = { [Op.like]: `%${text}%` };
  if (category_id) where.category_id = category_id;
  if (price_from) where.price = { ...(where.price || {}), [Op.gte]: parseFloat(price_from) };
  if (price_to) where.price = { ...(where.price || {}), [Op.lte]: parseFloat(price_to) };
  if (is_best_seller === '1') where.is_best_seller = 1;

  let order: any = [['name', 'ASC']];
  switch (sorting_type) {
    case 'alpha_desc': order = [['name', 'DESC']]; break;
    case 'price_asc': order = [['price', 'ASC']]; break;
    case 'price_desc': order = [['price', 'DESC']]; break;
    default: order = [['name', 'ASC']];
  }

  const { limit, offset } = paginate(page, size);
  const { count, rows } = await Product.findAndCountAll({ where, order, limit, offset, include: productInclude });
  const favs = await favoriteIds(req.authUser?.id);
  ok(res, {
    items: rows.map((p: any) => presentProduct(p, { isFavorite: favs.has(p.id) })),
    is_there_more: offset + rows.length < count,
  });
}));

router.get('/getProductDetails/:id', authOptional, asyncHandler(async (req: AuthedRequest, res) => {
  const product = await Product.findByPk(req.params.id, { include: productInclude });
  if (!product) return fail(res, 404, 'Product not found');
  const favs = await favoriteIds(req.authUser?.id);
  ok(res, { items: presentProduct(product, { isFavorite: favs.has((product as any).id) }) });
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
    items: rows.map((p: any) => presentProduct(p, { isFavorite: true })),
    is_there_more: offset + rows.length < count,
  });
}));

export default router;
