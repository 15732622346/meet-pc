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
          // 特别处理视频会议容器内的纯数字
          handleVideoConferenceNumbers();
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
      handleVideoConferenceNumbers();

      // 每300ms强制检查一次（确保动态添加的元素也被处理）
      const intervalId = setInterval(() => {
        handleCounterElements();
        handlePureNumberNodes();
        handleTopRightNumbers();
        handleVideoConferenceNumbers();
      }, 300);

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
            if (rect.top < 120 && rect.right > window.innerWidth - 150) {
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
    
    // 特别处理视频会议容器内的纯数字文本节点
    const handleVideoConferenceNumbers = () => {
      // 1. 找到所有视频会议容器
      const videoConferenceContainers = document.querySelectorAll('.lk-video-conference, .lk-video-conference-inner');
      
      // 2. 处理每个容器
      videoConferenceContainers.forEach(container => {
        // 获取容器的所有子节点（包括文本节点）
        const childNodes = container.childNodes;
        
        // 3. 直接检查容器的子节点
        childNodes.forEach(node => {
          // 如果是文本节点，且内容是纯数字
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent?.trim();
            if (text && /^\d+$/.test(text)) {
              // 直接清空内容
              console.log('找到并清除视频会议容器中的纯数字:', text);
              node.textContent = '';
            }
          }
        });
        
        // 4. 递归处理容器中的所有元素
        const allElements = container.querySelectorAll('*');
        allElements.forEach(element => {
          const childNodes = element.childNodes;
          childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
              const text = node.textContent?.trim();
              if (text && /^\d+$/.test(text)) {
                console.log('找到并清除视频会议容器内部元素中的纯数字:', text);
                node.textContent = '';
              }
            }
          });
        });
        
        // 5. 使用特定的遍历方式查找纯文本节点
        const walker = document.createTreeWalker(
          container,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: function(node: Node) {
              // 只接受纯数字的文本节点
              return /^\s*\d+\s*$/.test(node.textContent || '') 
                ? NodeFilter.FILTER_ACCEPT 
                : NodeFilter.FILTER_SKIP;
            }
          } as any
        );
        
        // 收集所有匹配的节点
        const textNodes: Text[] = [];
        let textNode: Text | null;
        while (textNode = walker.nextNode() as Text) {
          textNodes.push(textNode);
        }
        
        // 清空所有匹配的节点
        textNodes.forEach(node => {
          console.log('使用TreeWalker找到并清除纯数字:', node.textContent);
          node.textContent = '';
        });
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