import { useEffect } from 'react';

/**
 * HideLiveKitCounters组件
 * 用于隐藏页面上的计数器和未包裹的纯数字文本
 */
export function HideLiveKitCounters() {
  useEffect(() => {
    // 处理函数：隐藏计数器和纯数字文本
    const hideCounters = () => {
      // 使用MutationObserver监听DOM变化
      const observer = new MutationObserver((mutations) => {
        mutations.forEach(() => {
          // 处理计数器显示
          handleCounterElements();
          // 处理纯数字文本节点
          handlePureNumberNodes();
          // 特别处理页面右上角的数字
          handleTopRightNumbers();
        });
      });

      // 开始观察DOM变化
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      // 初始执行一次
      handleCounterElements();
      handlePureNumberNodes();
      handleTopRightNumbers();

      // 每500ms强制检查一次（确保动态添加的元素也被处理）
      const intervalId = setInterval(() => {
        handleCounterElements();
        handlePureNumberNodes();
        handleTopRightNumbers();
      }, 500);

      // 清理函数
      return () => {
        observer.disconnect();
        clearInterval(intervalId);
      };
    };

    // 处理计数器元素
    const handleCounterElements = () => {
      // 查找并处理所有文本节点
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
      );

      const nodesToProcess: Text[] = [];
      let node: Text | null;
      
      // 收集需要处理的节点
      while ((node = walker.nextNode() as Text)) {
        const text = node.textContent?.trim();
        if (text) {
          // 处理 "麦位列表 数字" 的情况
          if (text.includes('麦位列表') && /\d+$/.test(text)) {
            nodesToProcess.push(node);
            continue;
          }

          // 处理纯数字的情况
          if (/^\d+$/.test(text)) {
            const parent = node.parentElement;
            // 检查父元素是否为计数器相关元素
            if (parent && (
              parent.classList.contains('lk-participant-count') ||
              parent.classList.contains('lk-counter')
            )) {
              nodesToProcess.push(node);
            }
          }
        }
      }

      // 处理收集到的节点
      nodesToProcess.forEach(node => {
        if (node.textContent?.includes('麦位列表')) {
          // 对于 "麦位列表 数字" 的情况，只移除数字部分
          const newText = node.textContent.replace(/\s*\d+$/, '');
          node.textContent = newText;
        } else {
          // 对于其他情况，隐藏整个文本
          node.textContent = '';
        }
      });
    };

    // 处理纯数字文本节点
    const handlePureNumberNodes = () => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
      );

      const nodesToRemove: Text[] = [];
      let node: Text | null;

      while ((node = walker.nextNode() as Text)) {
        const text = node.textContent?.trim();
        if (text && /^\d+$/.test(text)) {
          // 检查父节点是否为普通容器元素
          const parent = node.parentElement;
          if (!parent || !isSpecialElement(parent)) {
            nodesToRemove.push(node);
          }
        }
      }

      // 移除收集到的纯数字节点
      nodesToRemove.forEach(node => {
        node.textContent = '';
      });
    };

    // 特别处理页面右上角的数字
    const handleTopRightNumbers = () => {
      // 使用位置信息查找右上角的元素
      const allElements = document.querySelectorAll('*');
      allElements.forEach(element => {
        // 只处理叶子节点（不包含其他元素的节点）
        if (element.childElementCount === 0) {
          const text = element.textContent?.trim();
          if (text && /^\d+$/.test(text)) {
            // 获取元素位置
            const rect = element.getBoundingClientRect();
            
            // 检查是否在页面右上角区域
            if (rect.top < 120 && rect.right > window.innerWidth - 100) {
              // 如果是HTMLElement，可以设置样式
              if (element instanceof HTMLElement) {
                element.style.display = 'none';
              }
              element.textContent = '';
            }
          }
        }
        
        // 特别处理：如果是直接子文本节点是纯数字
        if (element.childNodes.length > 0) {
          element.childNodes.forEach(childNode => {
            if (childNode.nodeType === Node.TEXT_NODE) {
              const text = childNode.textContent?.trim();
              if (text && /^\d+$/.test(text)) {
                const rect = element.getBoundingClientRect();
                // 检查是否在页面右上角区域或顶部区域
                if (rect.top < 120) {
                  childNode.textContent = '';
                }
              }
            }
          });
        }
      });
      
      // 直接处理顶部栏中的纯数字文本节点
      const headerElements = document.querySelectorAll('header, nav, .header, .navbar, .top-bar');
      headerElements.forEach(header => {
        processTextNodesRecursively(header);
      });
    };
    
    // 递归处理文本节点
    const processTextNodesRecursively = (element: Element) => {
      const childNodes = element.childNodes;
      for (let i = 0; i < childNodes.length; i++) {
        const node = childNodes[i];
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent?.trim();
          if (text && /^\d+$/.test(text)) {
            node.textContent = '';
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          processTextNodesRecursively(node as Element);
        }
      }
    };

    // 检查元素是否为特殊元素（不应该被处理的元素）
    const isSpecialElement = (element: Element): boolean => {
      // 定义不应该处理的元素类名列表
      const specialClasses = [
        'lk-participant-count',
        'lk-counter',
        'input',
        'textarea',
        'code',
        'pre'
      ];

      // 定义不应该处理的元素标签名列表
      const specialTags = [
        'input',
        'textarea',
        'code',
        'pre',
        'script',
        'style'
      ];

      // 检查元素是否包含特殊类名
      const hasSpecialClass = specialClasses.some(className => 
        element.classList.contains(className)
      );
      
      // 检查元素是否是特殊标签
      const isSpecialTag = specialTags.includes(element.tagName.toLowerCase());
      
      return hasSpecialClass || isSpecialTag;
    };

    // 启动监听
    hideCounters();
  }, []);

  return null;
}

export default HideLiveKitCounters; 