import { localized } from '../utils/requestContext';

/**
 * Presenters map Sequelize rows → the exact JSON keys the Flutter app parses.
 * Keep misspellings verbatim (is_fevorite, url_link, messag_type, defult, deliveryCost, etc.).
 */

export function presentCategory(c: any) {
  return { id: c.id, image: c.image, name: localized(c, 'name'), status: c.status, created_at: c.created_at ?? c.createdAt };
}

export function presentTypes(t: any) {
  return { id: t.id, status: t.status, created_at: t.created_at ?? t.createdAt, name: localized(t, 'name') };
}

export function presentCity(c: any) {
  return {
    id: c.id,
    deliveryCost: c.deliveryCost ?? c.delivery_cost ?? 0,
    country_id: c.country_id,
    status: c.status,
    created_at: c.created_at ?? c.createdAt,
    name: localized(c, 'name'),
    // Both names, so the app can match reverse-geocoded place names in either language.
    name_en: c.name_en || c.name,
    name_ar: c.name_ar ?? null,
    parent_id: c.parent_id ?? null,
  };
}

export function presentCountry(c: any) {
  return {
    id: c.id,
    currency_code: c.currency_code,
    country_code: c.country_code,
    status: c.status,
    image: c.image,
    icon_url: c.icon_url ?? null,
    created_at: c.created_at ?? c.createdAt,
    name: localized(c, 'name'),
    translations: (c.translations || []).map((t: any) => ({
      id: t.id,
      country_id: t.country_id,
      locale: t.locale,
      name: t.name,
      currency_name: t.currency_name,
      deleted_at: t.deleted_at,
      created_at: t.created_at ?? t.createdAt,
      updated_at: t.updated_at ?? t.updatedAt,
    })),
  };
}

export function presentBanner(b: any) {
  return {
    id: b.id,
    item_id: b.item_id,
    type: b.type,
    status: b.status,
    image: b.image,
    link: b.link,
    created_at: b.created_at ?? b.createdAt,
    category_name: b.category_name,
    video_url: b.video_url ?? null,
  };
}

export function presentProduct(p: any, opts: { isFavorite?: boolean; isCart?: number } = {}) {
  return {
    id: p.id,
    type: p.type,
    image: p.image,
    url_link: p.url_link,
    country_id: p.country_id,
    price: p.price,
    discount_price: p.discount_price,
    offer_end_date: p.offer_end_date,
    is_best_seller: p.is_best_seller,
    is_featured: p.is_featured,
    quantity: p.quantity,
    status: p.status,
    created_at: p.created_at ?? p.createdAt,
    is_cart: opts.isCart ?? 0,
    discount_percent: p.discount_percent,
    is_fevorite: opts.isFavorite ? '1' : '0',
    description: localized(p, 'description'),
    name: localized(p, 'name'),
    service_types: (p.service_types || []).map((st: any) => ({
      id: st.id,
      service_type_id: st.service_type_id,
      product_id: st.product_id,
      created_at: st.created_at ?? st.createdAt,
      service_type: st.service_type ? presentTypes(st.service_type) : null,
    })),
    cut_types: (p.cut_types || []).map((ct: any) => ({
      id: ct.id,
      cut_type_id: ct.cut_type_id,
      product_id: ct.product_id,
      created_at: ct.created_at ?? ct.createdAt,
      cut_type: ct.cut_type ? presentTypes(ct.cut_type) : null,
    })),
    images: (p.images || []).map((im: any) => ({
      id: im.id,
      product_id: im.product_id,
      image: im.image,
      created_at: im.created_at ?? im.createdAt,
    })),
  };
}

export function presentUser(u: any, accessToken?: string) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    mobile: u.mobile,
    country_id: u.country_id,
    image_profile: u.image_profile,
    remember_token: u.remember_token,
    status: u.status,
    notification_status: u.notification_status,
    is_verified: u.is_verified,
    created_at: u.created_at ?? u.createdAt,
    access_token: accessToken ?? undefined,
  };
}

/** Package for the app. price_after is what the customer pays; price_before is shown struck through. */
export function presentPackage(pkg: any) {
  const before = pkg.price_before != null ? Number(pkg.price_before) : null;
  const after = Number(pkg.price_after ?? 0);
  return {
    id: pkg.id,
    name: localized(pkg, 'name'),
    name_en: pkg.name,
    name_ar: pkg.name_ar ?? null,
    description: localized(pkg, 'description'),
    image: pkg.image,
    price_before: before,
    price_after: after,
    discount_percent: before && before > after ? Math.round(((before - after) / before) * 100) : 0,
    status: pkg.status,
    created_at: pkg.created_at ?? pkg.createdAt,
    products: (pkg.items || []).map((it: any) => ({
      id: it.id,
      product_id: it.product_id,
      quantity: it.quantity,
      product: it.product ? presentProduct(it.product) : null,
    })),
  };
}

/**
 * Product-shaped view of a package, so cart/checkout screens that render `product`
 * can show a package line unchanged (price = before, discount_price = after).
 */
export function packageAsProduct(pkg: any) {
  return {
    ...presentProduct({
      id: pkg.id, image: pkg.image, name: pkg.name, name_ar: pkg.name_ar,
      description: pkg.description, description_ar: pkg.description_ar,
      price: pkg.price_before ?? pkg.price_after, discount_price: pkg.price_before != null ? pkg.price_after : null,
      quantity: 9999, status: pkg.status,
    }),
    is_package: true,
  };
}
