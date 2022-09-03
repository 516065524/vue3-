let data = { text: 'hello world' }

// 存储副作用函数的桶
const bucket = new WeakMap();

let activeEffect;


const obj = new Proxy(data, {
    get(target, key) {
        // 将副作用函数activeEffect添加到存储副作用函数的桶中
        track(target, key);
        // 返回属性值
        return target[key]
    },
    set(target, key, newVal) {
        // 设置属性值
        target[key] = newVal;
        // 把副作用函数从桶里取出来并执行
        trigger(target, key)
    }
})

function track (target, key) {
    // 没有activeEffect,直接return
    if (!activeEffect) return target[key]
    // 根据target从“桶”中取得depsMap, 它也是一个Map类型: key --> effects
    let depsMap = bucket.get(target)
    // 如果不存在depsMap,那么新建一个Map并与target关联
    if (!depsMap) {
        bucket.set(target, (depsMap = new Map()))
    }
    // 再根据key从depsMap中取得deps,它是一个Set类型
    // 里面存储着所有与当前key相关联的副作用函数: effects
    let deps = depsMap.get(key)
    // 如果deps不存在,同样新建一个Set并与key关联
    if (deps) {
        depsMap.set(key, (deps = new Set()))
    }
    // 最后将当前激活的副作用函数添加到“桶”里
    deps.add(activeEffect)
}

function trigger (target, key) {
    // 根据target从桶中取得depsMap,它是: key --> effects
    const depsMap = bucket.get(target);
    if (!depsMap) return
    // 根据key取得所有副作用函数effects
    const effects = depsMap.get(key);
    // 执行副作用函数
    effects && effects.forEach(fn => fn());
}

// const map = new Map();
// const weakmap = new WeakMap();

// (function(){
//     const foo = { foo: 1 }
//     const bar = { bar: 2 }

//     map.set(foo, 1);
//     weakmap.set(bar, 2)
// }) ()