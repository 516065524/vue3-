let data = {text: 'hello world'}

// 用一个全局变量存储被注册的副作用函数
let activeEffect;

// effect函数用于注册副作用函数
function effect (fn) {
    // 当调用effect注册副作用函数时,将副作用函数fn赋值给activeEffect
    activeEffect = fn;
    // 执行副作用函数
    fn()
}

let bucket = new Set();

const obj = new Proxy(data, {
    // 拦截读取操作
    get(target, key) {
        // 将activeEffect中存储的副作用函数收集到“桶”中
        if (activeEffect) {
            bucket.add(activeEffect)
        }
        return target[key]
    },
    // 拦截设置操作
    set(target, key, newVal) {
        //设置属性值
        target[key] = newVal;
        //把副作用函数从桶中取出并执行
        bucket.forEach(fn => fn())
        //返回true代表设置操作成功
        return true
    }
})

effect(
    // 一个匿名的副作用函数
    () => {
        console.log(obj.text)
    }
)

setTimeout(() => {
    obj.notExist = 'hello vue3'
})