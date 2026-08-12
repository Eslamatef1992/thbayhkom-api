import { tr } from '../db/models';

/**
 * Presenters map Sequelize rows (leader's translated schema) → the exact JSON
 * keys the Flutter app parses. Names come from *_translations via tr(). Keep
 * misspellings verbatim (is_fevorite, url_link, messag_type, defult, deliveryCost).
 * `lang` is the request locale (en|ar); defaults to en.
 */

export function presentCategory(c: any, lang = 'en') {
  return {
    id: c.id,
    image: c.image,
    name: tr(c.translations, lang),
    status: c.status,
    created_at: c.created_at,
  };
}

export function presentTypes(t: any, lang = 'en') {
  return { id: t.id, status: t.status, created_at: t.created_at, name: tr(t.translations, lang) };
}

export function presentCity(c: any, lang = 'en') {
  return {
    id: c.id,
    deliveryCost: c.delivery_cost != null ? Number(c.delivery_cost) : 0,
    country_id: c.country_id,
    status: c.status,
    created_at: c.created_at,
    name: tr(c.translations, lang),
  };
}

export function presentCountry(c: any, lang = 'en') {
  return {
    id: c.id,
    currency_code: c.currency_code,
    country_code: c.country_code,
    status: c.status,
    image: c.image,
    created_at: c.created_at,
    name: tr(c.translations, lang),
    translations: (c.translations || []).map((t: any) => ({
      id: t.id,
      country_id: t.country_id,
      locale: t.locale,
      name: t.name,
      currency_name: t.currency_name,
      deleted_at: null,
      created_at: c.created_at,
      updated_at: c.updated_at,
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
    created_at: b.created_at,
    category_name: null,
  };
}

export function presentProduct(p: any, opts: { isFavorite?: boolean; isCart?: number; lang?: string } = {}) {
  const lang = opts.lang || 'en';
  return {
    id: p.id,
    type: p.type,
    image: p.image,
    url_link: null,
    country_id: p.country_id,
    price: p.price != null ? Number(p.price) : null,
    discount_price: p.discount_price != null ? Number(p.discount_price) : null,
    offer_end_date: p.offer_end_date,
    is_best_seller: p.is_best_seller,
    is_featured: p.is_featured,
    quantity: p.quantity,
    status: p.status,
    created_at: p.created_at,
    is_cart: opts.isCart ?? 0,
    discount_percent: null,
    is_fevorite: opts.isFavorite ? '1' : '0',
    description: tr(p.translations, lang, 'description'),
    name: tr(p.translations, lang),
    service_types: (p.service_types || []).map((st: any) => ({
      id: st.id,
      service_type_id: st.service_type_id,
      product_id: st.product_id,
      created_at: st.created_at,
      service_type: st.service_type ? presentTypes(st.service_type, lang) : null,
    })),
    cut_types: (p.cut_types || []).map((ct: any) => ({
      id: ct.id,
      cut_type_id: ct.cut_type_id,
      product_id: ct.product_id,
      created_at: ct.created_at,
      cut_type: ct.cut_type ? presentTypes(ct.cut_type, lang) : null,
    })),
    images: (p.images || []).map((im: any) => ({
      id: im.id,
      product_id: im.product_id,
      image: im.image,
      created_at: im.created_at,
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
    created_at: u.created_at,
    access_token: accessToken ?? undefined,
  };
}

