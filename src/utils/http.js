import axios from 'axios'
import router from '../router'
// import QS from 'qs' // 序列化post类型的数据
import { Toast } from 'vant'
import store from '@/store/index'

/**
 * 提示函数
 * 禁止点击蒙层、显示一秒后关闭
 */

const tip = msg => {
    Toast({
        message: msg,
        duration: 1000,
        forbidClick: true
    })
}

/*
*跳转登录页
* 携带当前页面路由，以期在登录页面完成登录后返回当前页面

*/

const toLogin = () => {
    router.replace({
        path: '/login',
        query: {
            redirect: router.currentRoute.fullPath
        }
    })
}

/** 
 * 请求失败后的错误统一处理 
 * @param {Number} status 请求失败的状态码
 */

const errorHandle = (status, other) => {
    // 状态码判断
    switch (status) {
        case 401:
            toLogin();
            break;
        case 403:
            tip('登录过期，请重新登录');
            localStorage.removeItem('token');
            store.commit('loginSuccess', null);
            setTimeout(() => { toLogin() }, 1000);
            break;
        case 404:
            tip('请求的资源不存在');
            break;
        default: console.log(other)
    }
}

// 创建axios实例

const http = axios.create({
    baseURL: 'http://localhost:9000/admin/api',
    timeout: 1000 * 12
})

// post请求头
http.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8';

// 请求拦截器
http.interceptors.request.use(
    config => {
        /* 每次发送请求之前判断vuex中是否存在token
         *  如果存在，则统一在http请求的header都加上token，这样后台根据token判断你的登录情况
         *  即使本地存在token，也有可能token是过期的，所以在响应拦截器中要对返回状态进行判断
        */

        const token = store.state.token;
        token && (config.headers.Authorization = token);
        return config;

    },
    error => {
        return Promise.error(error);
    }
)

// 响应拦截器
http.interceptors.response.use(

    // 如果返回的状态码诶200，说明接口请求成功，可以正常拿到数据
    // 否则的话抛出错误
    res => res.status === 200 ? Promise.resolve(res) : Promise.reject(res),

    /*
        * 服务器状态码不是2开头的情况
        * 这里可以跟你们的后台开发人员协商好统一的错误状态码
        * 然后根据返回的状态码进行一些操作，例如登录过期提示，错误提示等
        * 下面列举几个常见的操作，其他需求可自行扩展
    */
    error => {
        if(response) {
              // 请求已发出，但是不在2xx的范围
        errorHandle(response.status, response.data.message);
        return Promise.reject(response)
        } else {
            // 处理断网情况
            // eg: 请求超时或断网时，更新state的network状态
            // network状态在app.vue中控制着一个全局的断网提示组件的显示隐藏
            // 关于断网组件中的刷新重新获取数据，会在断网组件中说明
            if(!window.navigator.onLine) {
                store.commit( 'changeNetwork', false);
            } else {
                return Promise.reject(error);
            }
        }
      
    
    }
)

export default http;

