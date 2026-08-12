import { presentProduct, presentCountry, presentCity } from './catalog';
import { tr } from '../db/models';

export function presentSetting(s: any, pages: any[], cutTypes: any[], serviceTypes: any[], lang = 'en') {
  if (!s) return null;
  return {
    id: s.id,
    url: s.url,
    logo: s.logo,
    appointment_price: s.appointment_price,
    footer_logo: s.footer_logo,
    tax_amount: s.tax_amount,
    points_in_mony: s.points_in_mony,
    mony_in_points: s.mony_in_points,
    app_store_url: s.app_store_url,
    play_store_url: s.play_store_url,
    info_email: s.info_email,
    mobile: s.mobile,
    phone: s.phone,
    facebook: s.facebook,
    twitter: s.twitter,
    linked_in: s.linked_in,
    instagram: s.instagram,
    snapchat: s.snapchat,
    whatsApp: s.whatsApp,
    google_plus: s.google_plus,
    min_order: s.min_order,
    from_hour: s.from_hour,
    to_hour: s.to_hour,
    latitude: s.latitude,
    longitude: s.longitude,
    youtube: s.youtube,
    image: s.image,
    banner_image: s.banner_image,
    banner_link: s.banner_link,
    paginateTotal: s.paginate_total,
    admin_commission_parcent: s.admin_commission_parcent,
    is_maintenance_mode: s.is_maintenance_mode,
    is_alowed_register: s.is_alowed_register,
    is_alowed_login: s.is_alowed_login,
    is_alowed_buying: s.is_alowed_buying,
    is_alowed_cart: s.is_alowed_cart,
    account_need_to_activate: s.account_need_to_activate,
    created_at: s.created_at,
    updated_at: s.updated_at,
    title: tr(s.translations, lang, 'title'),
    description: tr(s.translations, lang, 'description'),
    address: tr(s.translations, lang, 'address'),
    pages: (pages || []).map((p: any) => ({
      id: p.id,
      slug: p.slug,
      image: p.image,
      views: p.views,
      created_at: p.created_at,
      title: tr(p.translations, lang, 'title'),
      description: tr(p.translations, lang, 'description'),
      key_words: tr(p.translations, lang, 'key_words'),
    })),
    cutTypes: (cutTypes || []).map((t: any) => ({ id: t.id, status: t.status, created_at: t.created_at, name: tr(t.translations, lang) })),
    serviceTypes: (serviceTypes || []).map((t: any) => ({ id: t.id, status: t.status, created_at: t.created_at, name: tr(t.translations, lang) })),
  };
}


export function presentAdvertisement(a: any) {
  if (!a) return null;
  return {
    id: a.id,
    type: a.type,
    item_id: a.item_id,
    status: a.status,
    image: a.image,
    link: a.link,
    created_at: a.created_at,
    category_name: a.category_name,
  };
}

export function presentAddress(a: any, lang = 'en') {
  return {
    id: a.id,
    user_id: a.user_id,
    address_name: a.address_name,
    country_id: a.country_id,
    city_id: a.city_id,
    governorate_id: a.governorate_id,
    country: a.country ? presentCountry(a.country, lang) : null,
    city: a.city ? presentCity(a.city, lang) : null,
    governorate: a.governorate ? presentCity(a.governorate, lang) : null,
    block: a.block,
    street: a.street,
    avenue: a.avenue,
    type: a.type,
    building_number: a.building_number,
    floor_number: a.floor_number,
    apartment_number: a.apartment_number,
    house_number: a.house_number,
    address_line_1: a.address_line_1,
    address_line_2: a.address_line_2,
    notes: a.notes,
    defult: a.defult,
    longitude: a.longitude,
    latitude: a.latitude,
    created_at: a.created_at,
  };
}


function typeShape(t: any, lang = 'en') {
  return t ? { id: t.id, status: t.status, created_at: t.created_at, name: tr(t.translations, lang) } : null;
}

export function presentCartItem(c: any, lang = 'en') {
  return {
    id: c.id,
    user_id: c.user_id,
    fcm_token: c.fcm_token,
    product_id: c.product_id,
    quantity: c.quantity,
    cut_type_id: c.cut_type_id,
    service_type_id: c.service_type_id,
    country_id: c.country_id,
    special_request: c.special_request,
    created_at: c.created_at,
    product: c.product ? presentProduct(c.product, { lang }) : null,
    cut_type: typeShape(c.cut_type, lang),
    service_type: typeShape(c.service_type, lang),
  };
}

const num = (v: any) => (v == null ? v : Number(v));

export function presentOrder(o: any) {
  return {
    id: o.id,
    user_id: o.user_id,
    total_price: num(o.total_price),
    address_id: o.address_id,
    discount: num(o.discount),
    delivery_cost: num(o.delivery_cost),
    discount_code: o.discount_code,
    sub_total: num(o.sub_total),
    count_items: o.count_items,
    fcm_token: o.fcm_token,
    name: o.name,
    email: o.email,
    mobile: o.mobile,
    payment_id: o.payment_id,
    transaction_id: o.transaction_id,
    payment_json: o.payment_json,
    payment_check_response: o.payment_check_response,
    payment_method: o.payment_method,
    payment_status: o.payment_status,
    status: o.status,
    ordered_date: o.ordered_date,
    special_request: o.special_request,
    created_at: o.created_at,
    status_name: o.status_name,
  };
}

export function presentOrderDetails(o: any, lang = 'en') {
  return {
    ...presentOrder(o),
    products: (o.products || []).map((op: any) => ({
      id: op.id,
      order_id: op.order_id,
      product_id: op.product_id,
      cut_type_id: op.cut_type_id,
      service_type_id: op.service_type_id,
      special_request: op.special_request,
      quantity: op.quantity,
      discount: num(op.discount),
      price: num(op.price),
      offer_price: num(op.offer_price),
      created_at: op.created_at,
      product: op.product ? presentProduct(op.product, { lang }) : null,
      service_type: typeShape(op.service_type, lang),
      cut_type: typeShape(op.cut_type, lang),
    })),
    address: o.address ? presentAddress(o.address) : null,
  };
}

export function presentPromotionCode(p: any) {
  return {
    id: p.id,
    code: p.code,
    percent: p.percent,
    type: p.type,
    status: p.status,
    start_date: p.start_date,
    end_date: p.end_date,
    description: p.description,
    created_at: p.created_at,
  };
}

export function presentNotification(n: any, lang = 'en') {
  return {
    id: n.id,
    user_id: n.user_id,
    order_id: n.order_id,
    messag_type: n.messag_type,
    status: n.status,
    created_at: n.created_at,
    message: tr(n.translations, lang, 'message'),
    title: tr(n.translations, lang, 'title'),
  };
}

