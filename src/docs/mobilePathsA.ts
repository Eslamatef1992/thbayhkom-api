import { S, I, ok200, form, pathId, queryPage } from './helpers';
import { mobileExamples } from './examples';

export function mobilePathsA(): Record<string, any> {
  const paths: Record<string, any> = {};

  // App / Settings
  paths['/getSetting'] = { get: { tags: ['App'], summary: 'App settings + advertisement, pages, cut/service types', responses: ok200(mobileExamples.getSetting) } };
  paths['/getCategories'] = { get: { tags: ['Catalog'], summary: 'List categories', responses: ok200(mobileExamples.getCategories) } };
  paths['/getCutTypes'] = { get: { tags: ['Catalog'], summary: 'List cut types', responses: ok200(mobileExamples.getCutTypes) } };
  paths['/getCountries'] = { get: { tags: ['App'], summary: 'List countries + translations', responses: ok200(mobileExamples.getCountries) } };
  paths['/getGovernoratesByCountryId/{id}'] = { get: { tags: ['App'], summary: 'Governorates for a country', parameters: [pathId()], responses: ok200(mobileExamples.getCities) } };
  paths['/getCitiesByCountryId/{id}'] = { get: { tags: ['App'], summary: 'Cities for a country', parameters: [pathId()], responses: ok200(mobileExamples.getCities) } };
  paths['/getBanners'] = { get: { tags: ['App'], summary: 'List banners', responses: ok200(mobileExamples.getBanners) } };
  paths['/contactUs'] = { post: { tags: ['App'], summary: 'Send a contact message', requestBody: form({ name: S, email: S, mobile: S, message: S }, [], { name: 'Jane', email: 'jane@example.com', mobile: '96599999999', message: 'Do you deliver to Salmiya?' }), responses: ok200() } };

  // Catalog
  paths['/getHomePage'] = { get: { tags: ['Catalog'], summary: 'Home page (categories, banners, best/featured)', security: [{ bearerAuth: [] }], responses: ok200(mobileExamples.getHomePage) } };
  paths['/getProducts'] = {
    post: {
      tags: ['Catalog'], summary: 'Search/filter/sort products (paginated)', security: [{ bearerAuth: [] }],
      parameters: [queryPage()],
      requestBody: form({
        text: S, category_id: S, price_from: S, price_to: S,
        sorting_type: { type: 'string', enum: ['alpha_asc', 'alpha_desc', 'price_asc', 'price_desc'] },
        is_best_seller: { type: 'string', enum: ['1'] }, 'service_types[0]': S, 'cut_types[0]': S,
      }, [], { text: 'beef', category_id: '1', price_from: '0', price_to: '20', sorting_type: 'price_asc' }),
      responses: ok200(mobileExamples.getProducts),
    },
  };
  paths['/getProductDetails/{id}'] = { get: { tags: ['Catalog'], summary: 'Product details', security: [{ bearerAuth: [] }], parameters: [pathId()], responses: ok200(mobileExamples.getProductDetails) } };
  paths['/addAndRemoveFromFavorite/{id}'] = { get: { tags: ['Catalog'], summary: 'Toggle favorite', security: [{ bearerAuth: [] }], parameters: [pathId()], responses: ok200() } };
  paths['/getMyFavorites'] = { get: { tags: ['Catalog'], summary: 'List favorites (paginated)', security: [{ bearerAuth: [] }], parameters: [queryPage()], responses: ok200(mobileExamples.getMyFavorites) } };

  // Authentication
  paths['/login'] = { post: { tags: ['Authentication'], summary: 'Email login', requestBody: form({ email: S, password: S, device_type: S, fcm_token: S }, ['email', 'password'], { email: 'john@example.com', password: 'Pass@123', device_type: 'android', fcm_token: 'fcm-token-123' }), responses: ok200(mobileExamples.auth) } };
  paths['/signUp'] = { post: { tags: ['Authentication'], summary: 'Email sign-up', requestBody: form({ name: S, email: S, mobile: S, password: S, confirm_password: S, device_type: S, fcm_token: S }, ['name', 'email', 'mobile', 'password', 'confirm_password'], { name: 'John Doe', email: 'john@example.com', mobile: '96599999999', password: 'Pass@123', confirm_password: 'Pass@123', device_type: 'android', fcm_token: 'fcm-token-123' }), responses: ok200(mobileExamples.auth) } };
  paths['/socialSignUp'] = { post: { tags: ['Authentication'], summary: 'Google sign-in (code 222 if mobile needed)', requestBody: form({ social_type: S, social_token: S, device_type: S, fcm_token: S }, ['social_type', 'social_token'], { social_type: 'google', social_token: '<google-id-token>', device_type: 'android', fcm_token: 'fcm-token-123' }), responses: ok200(mobileExamples.auth) } };
  paths['/socialCreateNewAccount'] = { post: { tags: ['Authentication'], summary: 'Finish social sign-up with mobile', requestBody: form({ social_type: S, social_token: S, mobile: S, device_type: S, fcm_token: S }, ['social_type', 'social_token', 'mobile'], { social_type: 'google', social_token: '<google-id-token>', mobile: '96599999999', device_type: 'android', fcm_token: 'fcm-token-123' }), responses: ok200(mobileExamples.auth) } };
  paths['/checkAppleAccount'] = { post: { tags: ['Authentication'], summary: 'Apple sign-in (code 222 if mobile needed)', requestBody: form({ apple_token: S, email: S, name: S, device_type: S, fcm_token: S }, ['apple_token'], { apple_token: '<apple-auth-code>', email: 'john@privaterelay.appleid.com', name: 'John Doe', device_type: 'ios', fcm_token: 'fcm-token-123' }), responses: ok200(mobileExamples.auth) } };
  paths['/appleCreateNewAccount'] = { post: { tags: ['Authentication'], summary: 'Finish Apple sign-up with mobile', requestBody: form({ apple_token: S, email: S, mobile: S, name: S, device_type: S, fcm_token: S }, ['apple_token', 'mobile'], { apple_token: '<apple-auth-code>', email: 'john@privaterelay.appleid.com', mobile: '96599999999', name: 'John Doe', device_type: 'ios', fcm_token: 'fcm-token-123' }), responses: ok200(mobileExamples.auth) } };
  paths['/forgotPassword'] = { post: { tags: ['Authentication'], summary: 'Request password reset (generic response)', requestBody: form({ email: S }, ['email'], { email: 'john@example.com' }), responses: ok200() } };
  paths['/logout'] = { get: { tags: ['Authentication'], summary: 'Logout', security: [{ bearerAuth: [] }], responses: ok200() } };

  // Account
  paths['/changePassword'] = { post: { tags: ['Account'], summary: 'Change password', security: [{ bearerAuth: [] }], requestBody: form({ old_password: S, password: S, confirm_password: S }, ['old_password', 'password', 'confirm_password'], { old_password: 'Pass@123', password: 'NewPass@123', confirm_password: 'NewPass@123' }), responses: ok200() } };
  paths['/editUserProfile'] = { post: { tags: ['Account'], summary: 'Update profile', security: [{ bearerAuth: [] }], requestBody: form({ name: S, mobile: S, email: S }, [], { name: 'John Doe', mobile: '96599999999', email: 'john@example.com' }), responses: ok200(mobileExamples.auth) } };
  paths['/updateMyLanguage'] = { post: { tags: ['Account'], summary: 'Update language', security: [{ bearerAuth: [] }], requestBody: form({ fcmToken: S, lang: { type: 'string', enum: ['en', 'ar'] }, device_type: S }, [], { fcmToken: 'fcm-token-123', lang: 'en', device_type: 'android' }), responses: ok200() } };
  paths['/updateNotificationStatus'] = { post: { tags: ['Account'], summary: 'Toggle push notifications', security: [{ bearerAuth: [] }], requestBody: form({ notification_status: { type: 'string', enum: ['0', '1'] }, fcmToken: S, device_type: S }, [], { notification_status: '1', fcmToken: 'fcm-token-123', device_type: 'android' }), responses: ok200() } };
  paths['/updateMyCountry'] = { post: { tags: ['Account'], summary: 'Set current country', security: [{ bearerAuth: [] }], requestBody: form({ country_id: S, fcmToken: S, device_type: S }, [], { country_id: '1', fcmToken: 'fcm-token-123', device_type: 'android' }), responses: ok200() } };
  paths['/removeMyAccount'] = { post: { tags: ['Account'], summary: 'Delete account', security: [{ bearerAuth: [] }], responses: ok200() } };

  return paths;
}
