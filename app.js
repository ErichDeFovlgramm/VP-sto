// Основное приложение ВП Store
const API_BASE = '';

// Глобальное состояние
let currentUser = null;
let cart = [];
let wishlist = [];
let products = [];

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    loadUser();
    loadCart();
    loadWishlist();
    loadProducts();
    setupAccessibility();
    updateCartCount();
});

// Загрузка продуктов из JSON
function loadProducts() {
    fetch('database.json')
        .then(response => response.json())
        .then(data => {
            products = data.products;
        })
        .catch(error => console.error('Error loading products:', error));
}

// Доступность
function setupAccessibility() {
    const fontIncrease = document.getElementById('fontIncrease');
    const fontDecrease = document.getElementById('fontDecrease');
    const highContrast = document.getElementById('highContrast');

    if (fontIncrease) {
        fontIncrease.addEventListener('click', () => {
            const currentSize = parseInt(getComputedStyle(document.body).fontSize);
            document.body.style.fontSize = (currentSize + 2) + 'px';
            localStorage.setItem('fontSize', currentSize + 2);
        });
    }

    if (fontDecrease) {
        fontDecrease.addEventListener('click', () => {
            const currentSize = parseInt(getComputedStyle(document.body).fontSize);
            if (currentSize > 12) {
                document.body.style.fontSize = (currentSize - 2) + 'px';
                localStorage.setItem('fontSize', currentSize - 2);
            }
        });
    }

    if (highContrast) {
        highContrast.addEventListener('click', () => {
            document.body.classList.toggle('high-contrast');
            localStorage.setItem('highContrast', document.body.classList.contains('high-contrast'));
        });
    }

    // Восстановление настроек
    const savedFontSize = localStorage.getItem('fontSize');
    if (savedFontSize) {
        document.body.style.fontSize = savedFontSize + 'px';
    }

    if (localStorage.getItem('highContrast') === 'true') {
        document.body.classList.add('high-contrast');
    }
}

// Управление пользователем
function loadUser() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
    }
}

function saveUser(user) {
    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

function isLoggedIn() {
    return currentUser !== null;
}

function isAdmin() {
    return currentUser && currentUser.role === 'admin';
}

// Корзина
function loadCart() {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
}

function addToCart(productId, quantity = 1) {
    const product = products.find(p => p.id === productId);
    if (!product) return false;

    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({ ...product, quantity });
    }

    saveCart();
    return true;
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
}

function updateCartQuantity(productId, quantity) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        if (quantity <= 0) {
            removeFromCart(productId);
        } else {
            item.quantity = quantity;
            saveCart();
        }
    }
}

function getCartTotal() {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

function updateCartCount() {
    const countEl = document.getElementById('cartCount');
    if (countEl) {
        countEl.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    }
}

function clearCart() {
    cart = [];
    saveCart();
}

// Вишлист
function loadWishlist() {
    if (!currentUser) return;
    const savedWishlist = localStorage.getItem('wishlist_' + (currentUser.email || 'guest'));
    if (savedWishlist) {
        wishlist = JSON.parse(savedWishlist);
    }
}

function saveWishlist() {
    if (!currentUser) return;
    localStorage.setItem('wishlist_' + (currentUser.email || 'guest'), JSON.stringify(wishlist));
}

function toggleWishlist(productId) {
    if (!currentUser) {
        alert('Для добавления в вишлист необходимо войти в систему');
        return;
    }

    const index = wishlist.indexOf(productId);
    if (index > -1) {
        wishlist.splice(index, 1);
    } else {
        wishlist.push(productId);
    }
    saveWishlist();
}

function isInWishlist(productId) {
    return wishlist.includes(productId);
}

// Заказы
function createOrder(orderData) {
    fetch('database.json')
        .then(response => response.json())
        .then(db => {
            const order = {
                id: Date.now(),
                orderNumber: 'ORD-' + Date.now(),
                userId: currentUser.email,
                items: [...cart],
                total: getCartTotal(),
                status: 'pending',
                deliveryMethod: orderData.deliveryMethod,
                deliveryAddress: orderData.deliveryAddress,
                paymentMethod: orderData.paymentMethod,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            db.orders.push(order);
            
            // Сохраняем в localStorage (в реальном проекте был бы сервер)
            const allOrders = JSON.parse(localStorage.getItem('allOrders') || '[]');
            allOrders.push(order);
            localStorage.setItem('allOrders', JSON.stringify(allOrders));

            // Очищаем корзину
            clearCart();

            // Уведомление
            alert(`Заказ ${order.orderNumber} успешно оформлен! Статус: ${order.status}`);

            return order;
        })
        .catch(error => console.error('Error creating order:', error));
}

function getOrders() {
    if (!currentUser) return [];
    const allOrders = JSON.parse(localStorage.getItem('allOrders') || '[]');
    return allOrders.filter(order => order.userId === currentUser.email);
}

function updateOrderStatus(orderId, newStatus) {
    const allOrders = JSON.parse(localStorage.getItem('allOrders') || '[]');
    const order = allOrders.find(o => o.id === orderId);
    if (order) {
        order.status = newStatus;
        order.updatedAt = new Date().toISOString();
        localStorage.setItem('allOrders', JSON.stringify(allOrders));

        // Уведомление (в реальном проекте была бы отправка email)
        alert(`Статус заказа ${order.orderNumber} изменен на: ${newStatus}`);
        return true;
    }
    return false;
}

// Регистрация пользователя
function registerUser(userData) {
    fetch('database.json')
        .then(response => response.json())
        .then(db => {
            const existingUser = db.users.find(u => u.email === userData.email);
            if (existingUser) {
                return { success: false, message: 'Пользователь с таким email уже существует' };
            }

            const newUser = {
                id: Date.now(),
                email: userData.email,
                password: userData.password,
                name: userData.name,
                role: 'user',
                consentGiven: userData.consentGiven,
                registeredAt: new Date().toISOString()
            };

            db.users.push(newUser);
            saveUser(newUser);
            return { success: true, user: newUser };
        })
        .catch(error => ({ success: false, message: 'Ошибка регистрации' }));
}

// Вход пользователя
function loginUser(email, password) {
    return fetch('database.json')
        .then(response => response.json())
        .then(db => {
            const user = db.users.find(u => u.email === email && u.password === password);
            if (user) {
                saveUser(user);
                return { success: true, user };
            }
            return { success: false, message: 'Неверный логин или пароль' };
        })
        .catch(error => ({ success: false, message: 'Ошибка входа' }));
}

// Поиск и фильтрация
function searchProducts(query) {
    if (!query) return products;
    const lowerQuery = query.toLowerCase();
    return products.filter(p => 
        p.name.toLowerCase().includes(lowerQuery) ||
        p.description.toLowerCase().includes(lowerQuery) ||
        p.category.toLowerCase().includes(lowerQuery)
    );
}

function filterProducts(filters) {
    let result = [...products];

    if (filters.category) {
        result = result.filter(p => p.category === filters.category);
    }

    if (filters.ageRating) {
        result = result.filter(p => p.ageRating === filters.ageRating);
    }

    if (filters.inStock !== undefined) {
        result = result.filter(p => p.inStock === filters.inStock);
    }

    if (filters.minPrice) {
        result = result.filter(p => p.price >= filters.minPrice);
    }

    if (filters.maxPrice) {
        result = result.filter(p => p.price <= filters.maxPrice);
    }

    return result;
}

function sortProducts(products, sortBy) {
    const sorted = [...products];
    switch (sortBy) {
        case 'price-asc':
            sorted.sort((a, b) => a.price - b.price);
            break;
        case 'price-desc':
            sorted.sort((a, b) => b.price - a.price);
            break;
        case 'name-asc':
            sorted.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'name-desc':
            sorted.sort((a, b) => b.name.localeCompare(a.name));
            break;
    }
    return sorted;
}

// Админ функции
function adminAddProduct(productData) {
    fetch('database.json')
        .then(response => response.json())
        .then(db => {
            const newProduct = {
                id: Date.now(),
                ...productData
            };
            db.products.push(newProduct);
            products.push(newProduct);
            alert('Товар успешно добавлен');
            return newProduct;
        })
        .catch(error => console.error('Error adding product:', error));
}

function adminUpdateProduct(productId, updates) {
    fetch('database.json')
        .then(response => response.json())
        .then(db => {
            const product = db.products.find(p => p.id === productId);
            if (product) {
                Object.assign(product, updates);
                const localProduct = products.find(p => p.id === productId);
                if (localProduct) {
                    Object.assign(localProduct, updates);
                }
                alert('Товар успешно обновлен');
            }
        })
        .catch(error => console.error('Error updating product:', error));
}

function adminDeleteProduct(productId) {
    if (!confirm('Вы уверены, что хотите удалить этот товар?')) return;

    fetch('database.json')
        .then(response => response.json())
        .then(db => {
            db.products = db.products.filter(p => p.id !== productId);
            products = products.filter(p => p.id !== productId);
            alert('Товар успешно удален');
        })
        .catch(error => console.error('Error deleting product:', error));
}

// CDEK интеграция (симуляция)
function redirectToCDEK(address) {
    // В реальном проекте здесь был бы редирект на API СДЭК
    const cdekUrl = `https://www.cdek.ru/ru/orders/create?address=${encodeURIComponent(address)}`;
    window.open(cdekUrl, '_blank');
}

// Утилиты
function formatPrice(price) {
    return price.toLocaleString('ru-RU') + ' ₽';
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
