# Write your code here
class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
         seen ={}
         for current_index, current_num in enumerate(nums):
            if (complement := target  - current_num) in seen:
                #if complement in seen is reduced using walrus as it checks and  calculates at the same time 
                return [seen[complement], current index]

            seen[current_num]=current index

    # start with empty dictionary! dictionary structure: currentnumber: index because we look up by the number aka the complement to find out where it was located. 
    # look at the first num and index
    # calculate complement and see if its in our empty dictionary thats keeping track of what we've seen
    # if yes, look up the complment value in our dictionary and grab it's index where it was found in the original list 
    # if not update seen with the current number as the KEY of the dictionary and the current_index as the Value of the seen dictionary
    # thanks to enumerate turning our list of values into a line of pairs with index, value the current index always holds the exact index of whatever value we are currently looking at!

rest of loop is ignored when if is true it breaks out early if no solution exits the loop runs until end of list and function finishes naturally